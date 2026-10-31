import { createRequire } from 'node:module'
import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
import esmPlugin from 'eslint-plugin-import-x'

const require = createRequire(import.meta.url)
const cjsPlugin = require('eslint-plugin-import-x') as typeof esmPlugin

describe.each([
  ['ES module', esmPlugin],
  ['CommonJS', cjsPlugin],
] as const)('import plugin %s compatibility', (_format, plugin) => {
  it('enforces configured forbidden paths without blocking other paths', () => {
    const linter = new Linter()
    const config = {
      plugins: { 'import-x': plugin },
      rules: { 'import-x/no-internal-modules': ['error', { forbid: ['example/internal/**'] }] },
    } as const
    const source = "import 'example/internal/secret';\nimport 'example/public';"
    const messages = linter.verify(source, config)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.ruleId).toBe('import-x/no-internal-modules')
    expect(messages[0]?.line).toBe(1)
  })

  it('respects allowed paths and rejects other resolved internal imports', () => {
    const linter = new Linter()
    const source = "import './app/utils/errors.ts'"
    const verify = (allow: string[]) =>
      linter.verify(
        source,
        {
          plugins: { 'import-x': plugin },
          rules: { 'import-x/no-internal-modules': ['error', { allow }] },
        },
        { filename: `${process.cwd()}/index.js` },
      )
    expect(verify(['app/utils/**'])).toHaveLength(0)
    expect(verify(['app/components/**'])[0]?.ruleId).toBe('import-x/no-internal-modules')
  })
})
