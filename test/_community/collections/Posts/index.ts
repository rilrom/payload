import type { CollectionConfig } from 'payload'

export const postsSlug = 'posts'

export const PostsCollection: CollectionConfig = {
  slug: postsSlug,
  admin: {
    useAsTitle: 'title',
  },
  access: {
    update: (args) => {
      console.log("ARGS DATA", args.data);

      if (args?.data?.deletedAt) {
        return false;
      }

      return true;
    }
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'deletedAt',
      type: 'date',
    }
  ],
}
