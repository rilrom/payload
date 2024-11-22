import type { CollectionConfig } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'title',
  },
  access: {
    update: () => false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'blocks',
      type: 'blocks',
      blocks: [
        {
          slug: 'block',
          fields: [
            {
              name: 'block-text',
              type: 'text',
            },
          ],
        },
      ],
    },
  ],
  versions: {
    drafts: true,
  },
}
