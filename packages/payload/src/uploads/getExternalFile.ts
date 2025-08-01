import type { PayloadRequest } from '../types/index.js'
import type { File, FileData, UploadConfig } from './types.js'

import { APIError } from '../errors/index.js'
import { isURLAllowed } from '../utilities/isURLAllowed.js'
import { safeFetch } from './safeFetch.js'

type Args = {
  data: FileData
  req: PayloadRequest
  uploadConfig: UploadConfig
}
export const getExternalFile = async ({ data, req, uploadConfig }: Args): Promise<File> => {
  const { filename, url } = data

  if (typeof url === 'string') {
    let fileURL = url
    if (!url.startsWith('http')) {
      const baseUrl = req.headers.get('origin') || `${req.protocol}://${req.headers.get('host')}`
      fileURL = `${baseUrl}${url}`
    }

    const headers = uploadConfig.externalFileHeaderFilter
      ? uploadConfig.externalFileHeaderFilter(Object.fromEntries(new Headers(req.headers)))
      : {
          cookie:
            req.headers
              .get('cookie')
              ?.split(';')
              .filter((cookie) => !cookie.trim().startsWith(req.payload.config.cookiePrefix))
              .join(';') || '',
        }

    // Check if URL is allowed because of skipSafeFetch allowList
    const skipSafeFetch: boolean =
      uploadConfig.skipSafeFetch === true
        ? uploadConfig.skipSafeFetch
        : Array.isArray(uploadConfig.skipSafeFetch) &&
          isURLAllowed(fileURL, uploadConfig.skipSafeFetch)

    // Check if URL is allowed because of pasteURL allowList
    const isAllowedPasteUrl: boolean | undefined =
      uploadConfig.pasteURL &&
      uploadConfig.pasteURL.allowList &&
      isURLAllowed(fileURL, uploadConfig.pasteURL.allowList)

    let res
    if (skipSafeFetch || isAllowedPasteUrl) {
      // Allowed
      res = await fetch(fileURL, {
        credentials: 'include',
        headers,
        method: 'GET',
      })
    } else {
      // Default
      res = await safeFetch(fileURL, {
        credentials: 'include',
        headers,
        method: 'GET',
      })
    }

    if (!res.ok) {
      throw new APIError(`Failed to fetch file from ${fileURL}`, res.status)
    }

    const data = await res.arrayBuffer()

    return {
      name: filename,
      data: Buffer.from(data),
      mimetype: res.headers.get('content-type') || undefined!,
      size: Number(res.headers.get('content-length')) || 0,
    }
  }

  throw new APIError('Invalid file url', 400)
}
