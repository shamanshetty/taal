import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaalAI',
    short_name: 'TaalAI',
    description: 'Personal financial coach for Indian creators and freelancers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#010409',
    theme_color: '#0ea5e9',
    icons: [
      {
        src: '/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  }
}
