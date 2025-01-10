import type { CollectionConfig } from 'payload'

export const UsersCollection: CollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [
    {
      name: 'shouldBeHidden',
      type: 'text',
      access: {
        read: () => false,
      },
      admin: {
        condition: () => false,
      },
    },
  ],
}
