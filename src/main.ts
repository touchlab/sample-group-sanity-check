import * as core from '@actions/core'
import * as github from '@actions/github'
import { parse } from 'dot-properties'
import * as fs from 'fs'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Expect GROUP to be set in gradle.properties
    const src = fs.readFileSync('gradle.properties', 'utf8')
    const obj = parse(src)
    // Expect the hardcoded key GROUP for now
    const groupId = obj['GROUP'] as string

    // We are only interested in failing if groupId is set to co.touchlab
    if (groupId.startsWith('co.touchlab.')) {
      const owner = github.context.repo.owner
      // It's okay to have above groupId if org is touchlab
      // otherwise, fail the workflow
      if (owner !== 'touchlab') {
        core.setFailed(
          'Cannot publish with touchlab groupId. Change GROUP value in gradle.properties'
        )
        return
      }
    }
  } catch (error) {
    // Log error but don't fail the workflow run
    if (error instanceof Error) {
      core.error(`Error occurred: ${error.message}`)
    }
  }
}
