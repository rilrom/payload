'use client'
import type {
  ClientCollectionConfig,
  DefaultCellComponentProps,
  TextFieldClient,
  UploadFieldClient,
} from 'payload'

import React from 'react'

import { Thumbnail } from '../../../../Thumbnail/index.js'
import './index.scss'

const baseClass = 'file'

export interface FileCellProps
  extends DefaultCellComponentProps<TextFieldClient | UploadFieldClient> {
  readonly collectionConfig: ClientCollectionConfig
}

export const FileCell: React.FC<FileCellProps> = ({
  cellData: filename,
  collectionConfig,
  field,
  rowData,
}) => {
  const fieldPreviewAllowed = 'displayPreview' in field ? field.displayPreview : undefined
  const previewAllowed = fieldPreviewAllowed ?? collectionConfig.upload?.displayPreview ?? true

  if (previewAllowed) {
    return (
      <div className={baseClass}>
        <Thumbnail
          className={`${baseClass}__thumbnail`}
          collectionSlug={collectionConfig?.slug}
          doc={{
            ...rowData,
            filename,
          }}
          fileSrc={rowData?.thumbnailURL || rowData?.url}
          size="small"
          uploadConfig={collectionConfig?.upload}
        />
        <span className={`${baseClass}__filename`}>{String(filename)}</span>
      </div>
    )
  } else {
    return <>{String(filename)}</>
  }
}
