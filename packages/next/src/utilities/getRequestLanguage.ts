import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies.js'
import type { SanitizedConfig } from 'payload/config'

import { matchLanguage } from '@payloadcms/translations'

type GetRequestLanguageArgs = {
  config: SanitizedConfig
  cookies: Map<string, string> | ReadonlyRequestCookies
  defaultLanguage?: string
  headers: Request['headers']
}

export const getRequestLanguage = ({
  config,
  cookies,
  defaultLanguage = 'en',
  headers,
}: GetRequestLanguageArgs): string => {
  const acceptLanguage = headers.get('Accept-Language')
  const cookieLanguage = cookies.get(`${config.cookiePrefix || 'payload'}-lng`)

  const reqLanguage =
    (typeof cookieLanguage === 'string' ? cookieLanguage : cookieLanguage?.value) ||
    acceptLanguage ||
    defaultLanguage

  return matchLanguage(reqLanguage)
}