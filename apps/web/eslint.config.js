//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      'src/routeTree.gen.ts',
      'src/**/*.gen.ts',
      'src/components/ui/**',
      '.vinxi/**',
      'dist/**',
      '.output/**',
    ],
  },
]
