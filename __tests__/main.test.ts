import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import { run } from './../src/main'

jest.mock('@actions/core')
// Keep the real fs module: @actions/core's dependency graph reads fs.constants
// at import time, so replacing fs wholesale breaks module loading.
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn()
}))

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

  it('should fail if groupId is co.touchlab and repo does not start with touchlab/', async () => {
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

  it('should not fail if groupId is co.touchlab and repo starts with touchlab/', async () => {
    readFileSync.mockReturnValue('GROUP=co.touchlab.xyz')

    jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
      return {
        owner: 'some-owner',
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
