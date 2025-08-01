import type { CollectionSlug, ServerProps, ViewTypes } from 'payload'

import { headers as getHeaders } from 'next/headers.js'
import { redirect } from 'next/navigation.js'

import type { MultiTenantPluginConfig } from '../../types.js'

import { getGlobalViewRedirect } from '../../utilities/getGlobalViewRedirect.js'

type Args = {
  basePath?: string
  collectionSlug: CollectionSlug
  docID?: number | string
  globalSlugs: string[]
  tenantArrayFieldName: string
  tenantArrayTenantFieldName: string
  tenantFieldName: string
  tenantsCollectionSlug: string
  useAsTitle: string
  userHasAccessToAllTenants: Required<MultiTenantPluginConfig<any>>['userHasAccessToAllTenants']
  viewType: ViewTypes
} & ServerProps

export const GlobalViewRedirect = async (args: Args) => {
  const collectionSlug = args?.collectionSlug
  if (collectionSlug && args.globalSlugs?.includes(collectionSlug)) {
    const headers = await getHeaders()
    const redirectRoute = await getGlobalViewRedirect({
      slug: collectionSlug,
      basePath: args.basePath,
      docID: args.docID,
      headers,
      payload: args.payload,
      tenantFieldName: args.tenantFieldName,
      tenantsArrayFieldName: args.tenantArrayFieldName,
      tenantsArrayTenantFieldName: args.tenantArrayTenantFieldName,
      tenantsCollectionSlug: args.tenantsCollectionSlug,
      useAsTitle: args.useAsTitle,
      user: args.user,
      userHasAccessToAllTenants: args.userHasAccessToAllTenants,
      view: args.viewType,
    })

    if (redirectRoute) {
      redirect(redirectRoute)
    }
  }
}
