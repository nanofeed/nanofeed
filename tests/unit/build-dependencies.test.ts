import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// Resolve through Nitro so this checks its installed consumer, including nested
// copies, rather than accidentally testing a different hoisted glob package.
const nitroRequire = createRequire(import.meta.resolve('nitropack'))
const archiverRequire = createRequire(nitroRequire.resolve('archiver'))
const utils = archiverRequire('archiver-utils') as {
  file: {
    expand: (
      options: { cwd: string; dot?: boolean; nodir?: boolean; filter?: string },
      patterns: string[],
    ) => string[]
    expandMapping: (
      patterns: string[],
      destination: string,
      options: { cwd: string; ext: string },
    ) => { src: string[]; dest: string }[]
  }
}

it('preserves Nitro archive file expansion with the upgraded glob dependency', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'nanofeed-archive-'))
  try {
    await mkdir(join(cwd, 'nested'))
    for (const file of ['index.txt', '.config', 'nested/post.txt', 'nested/skip.txt']) {
      await writeFile(join(cwd, file), file)
    }

    expect(
      utils.file.expand({ cwd, dot: true, nodir: true }, ['**/*', '!**/skip.txt']).sort(),
    ).toEqual(['.config', 'index.txt', 'nested/post.txt'])
    expect(utils.file.expand({ cwd, filter: 'isDirectory' }, ['**/*'])).toEqual(['nested'])
    expect(
      utils.file.expandMapping(['nested/*.txt', '!**/skip.txt'], 'bundle', { cwd, ext: '.md' }),
    ).toEqual([{ src: [join(cwd, 'nested/post.txt')], dest: 'bundle/nested/post.md' }])
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
