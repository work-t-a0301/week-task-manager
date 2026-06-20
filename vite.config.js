import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pagesはリポジトリ名のサブパス配信のため、ベースパスを明示する
  base: '/week-task-manager/',
})
