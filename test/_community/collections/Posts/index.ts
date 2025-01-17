import type { CollectionConfig } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'richText',
      type: 'richText',
    },
    {
      name: 'sidebar',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  versions: {
    drafts: true,
  },
}
