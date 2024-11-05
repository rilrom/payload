import type { CollectionConfig } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['text', 'mediaRelationship'],
  },
  fields: [
    {
      name: 'text',
      label: 'Text Field',
      type: 'text',
    },
    {
      name: 'mediaRelationship',
      type: 'relationship',
      relationTo: 'media',
    },
  ],
  versions: {
    drafts: true,
  },
}
