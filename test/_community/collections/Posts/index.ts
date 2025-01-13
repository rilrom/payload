import type { CollectionConfig } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'title',
  },
  access: {
    create: (args) => {
      if (args.req.locale !== args.req.payload.config.localization['defaultLocale']) {
        return false
      }

      return true
    },
    delete: (args) => {
      if (args.req.locale !== args.req.payload.config.localization['defaultLocale']) {
        return false
      }

      return true
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
    },
  ],
  versions: {
    drafts: true,
  },
}
