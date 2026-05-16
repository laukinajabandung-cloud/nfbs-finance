import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/nfbs-finance/', // Tambahkan baris ini sesuai nama repositori GitHub Umi
})