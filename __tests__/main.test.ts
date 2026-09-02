import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import { run } from './../src/main'

jest.mock('@actions/core')
// Keep the real fs module, and have readFileSync delegate to it by default.
// Two things read fs at import time, before any test can set a return value:
// @actions/core's dependency graph reads fs.constants, and @actions/github
// builds its default Context, which JSON.parses readFileSync(GITHUB_EVENT_PATH)
// whenever that variable is set -- as it always is on a CI runner. A bare
// jest.fn() returns undefined there and throws. Individual tests still override
// readFileSync for their own call.
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs')
  return {
    ...actual,
    readFileSync: jest.fn(actual.readFileSync)
  }
})

const readFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>

describe('GitHub Action Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should pass if groupId is not co.touchlab', async () => {
    readFileSync.mockReturnValue('GROUP=other')

    await run()

    // Assert that setFailed was not called
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail if groupId is co.touchlab and owner is not touchlab', async () => {
    readFileSync.mockReturnValue('GROUP=co.touchlab.abc')

    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'some-owner',
        repo: 'other/repo'
      }
    })

    await run()

    // Assert that setFailed was called with the expected message
    expect(core.setFailed).toHaveBeenCalledWith(
      'Cannot publish with touchlab groupId. Change GROUP value in gradle.properties'
    )
  })

  it('should not fail if groupId is co.touchlab and owner is touchlab', async () => {
    readFileSync.mockReturnValue('GROUP=co.touchlab.xyz')

    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'touchlab',
        repo: 'touchlab/repo'
      }
    })

    await run()

    // Assert that setFailed was not called
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should log an error if an exception occurs', async () => {
    // Mock an exception
    readFileSync.mockImplementation(() => {
      throw new Error('Test error')
    })

    await run()

    // Assert that core.error was called with the expected message
    expect(core.error).toHaveBeenCalledWith('Error occurred: Test error')
  })
})
