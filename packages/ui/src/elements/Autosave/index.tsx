'use client'
// TODO: abstract the `next/navigation` dependency out from this component
import type { ClientCollectionConfig, ClientGlobalConfig } from 'payload'

import { dequal } from 'dequal/lite'
import { reduceFieldsToValues, versionDefaults } from 'payload/shared'
import React, { useDeferredValue, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  useAllFormFields,
  useForm,
  useFormModified,
  useFormSubmitted,
} from '../../forms/Form/context.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import { useEffectEvent } from '../../hooks/useEffectEvent.js'
import { useQueues } from '../../hooks/useQueues.js'
import { useConfig } from '../../providers/Config/index.js'
import { useDocumentEvents } from '../../providers/DocumentEvents/index.js'
import { useDocumentInfo } from '../../providers/DocumentInfo/index.js'
import { useLocale } from '../../providers/Locale/index.js'
import { useTranslation } from '../../providers/Translation/index.js'
import { formatTimeToNow } from '../../utilities/formatDocTitle/formatDateTitle.js'
import { reduceFieldsToValuesWithValidation } from '../../utilities/reduceFieldsToValuesWithValidation.js'
import { useDocumentDrawerContext } from '../DocumentDrawer/Provider.js'
import { LeaveWithoutSaving } from '../LeaveWithoutSaving/index.js'
import './index.scss'

const baseClass = 'autosave'
// The minimum time the saving state should be shown
const minimumAnimationTime = 1000

export type Props = {
  collection?: ClientCollectionConfig
  global?: ClientGlobalConfig
  id?: number | string
  publishedDocUpdatedAt: string
}

export const Autosave: React.FC<Props> = ({ id, collection, global: globalDoc }) => {
  const {
    config: {
      routes: { api },
      serverURL,
    },
  } = useConfig()

  const {
    docConfig,
    incrementVersionCount,
    lastUpdateTime,
    mostRecentVersionIsAutosaved,
    setLastUpdateTime,
    setMostRecentVersionIsAutosaved,
    setUnpublishedVersionCount,
    updateSavedDocumentData,
  } = useDocumentInfo()

  const { onSave: onSaveFromDocumentDrawer } = useDocumentDrawerContext()

  const { reportUpdate } = useDocumentEvents()
  const { dispatchFields, isValid, setBackgroundProcessing, setIsValid } = useForm()

  const [formState] = useAllFormFields()
  const modified = useFormModified()
  const submitted = useFormSubmitted()

  const { code: locale } = useLocale()
  const { i18n, t } = useTranslation()

  const versionsConfig = docConfig?.versions
  let interval = versionDefaults.autosaveInterval

  if (versionsConfig.drafts && versionsConfig.drafts.autosave) {
    interval = versionsConfig.drafts.autosave.interval
  }

  const validateOnDraft = Boolean(
    docConfig?.versions?.drafts && docConfig?.versions?.drafts.validate,
  )

  const [_saving, setSaving] = useState(false)

  const saving = useDeferredValue(_saving)

  const debouncedFormState = useDebounce(formState, interval)

  const formStateRef = useRef(formState)
  const modifiedRef = useRef(modified)
  const localeRef = useRef(locale)

  // Store fields in ref so the autosave func
  // can always retrieve the most to date copies
  // after the timeout has executed
  formStateRef.current = formState

  // Store modified in ref so the autosave func
  // can bail out if modified becomes false while
  // timing out during autosave
  modifiedRef.current = modified

  // Store locale in ref so the autosave func
  // can always retrieve the most to date locale
  localeRef.current = locale

  const { queueTask } = useQueues()

  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleAutosave = useEffectEvent(() => {
    autosaveTimeoutRef.current = undefined
    // We need to log the time in order to figure out if we need to trigger the state off later
    let startTimestamp = undefined
    let endTimestamp = undefined

    const hideIndicator = () => {
      // If request was faster than minimum animation time, animate the difference
      if (endTimestamp - startTimestamp < minimumAnimationTime) {
        autosaveTimeoutRef.current = setTimeout(
          () => {
            setSaving(false)
          },
          minimumAnimationTime - (endTimestamp - startTimestamp),
        )
      } else {
        stopAutoSaveIndicator()
      }
    }

    queueTask(
      async () => {
        if (modified) {
          startTimestamp = new Date().getTime()

          setSaving(true)

          let url: string
          let method: string
          let entitySlug: string

          if (collection && id) {
            entitySlug = collection.slug
            url = `${serverURL}${api}/${entitySlug}/${id}?draft=true&autosave=true&locale=${localeRef.current}`
            method = 'PATCH'
          }

          if (globalDoc) {
            entitySlug = globalDoc.slug
            url = `${serverURL}${api}/globals/${entitySlug}?draft=true&autosave=true&locale=${localeRef.current}`
            method = 'POST'
          }

          if (url) {
            if (modifiedRef.current) {
              const { data, valid } = reduceFieldsToValuesWithValidation(formStateRef.current, true)

              data._status = 'draft'

              const skipSubmission =
                submitted && !valid && versionsConfig?.drafts && versionsConfig?.drafts?.validate

              if (!skipSubmission) {
                let res

                try {
                  res = await fetch(url, {
                    body: JSON.stringify(data),
                    credentials: 'include',
                    headers: {
                      'Accept-Language': i18n.language,
                      'Content-Type': 'application/json',
                    },
                    method,
                  })
                } catch (_err) {
                  // Swallow Error
                }

                const newDate = new Date()
                // We need to log the time in order to figure out if we need to trigger the state off later
                endTimestamp = newDate.getTime()

                const json = await res.json()

                if (res.status === 200) {
                  setLastUpdateTime(newDate.getTime())

                  reportUpdate({
                    id,
                    entitySlug,
                    updatedAt: newDate.toISOString(),
                  })

                  // if onSaveFromDocumentDrawer is defined, call it
                  if (typeof onSaveFromDocumentDrawer === 'function') {
                    void onSaveFromDocumentDrawer({
                      ...json,
                      operation: 'update',
                    })
                  }

                  if (!mostRecentVersionIsAutosaved) {
                    incrementVersionCount()
                    setMostRecentVersionIsAutosaved(true)
                    setUnpublishedVersionCount((prev) => prev + 1)
                  }
                }

                if (versionsConfig?.drafts && versionsConfig?.drafts?.validate && json?.errors) {
                  if (Array.isArray(json.errors)) {
                    const [fieldErrors, nonFieldErrors] = json.errors.reduce(
                      ([fieldErrs, nonFieldErrs], err) => {
                        const newFieldErrs = []
                        const newNonFieldErrs = []

                        if (err?.message) {
                          newNonFieldErrs.push(err)
                        }

                        if (Array.isArray(err?.data)) {
                          err.data.forEach((dataError) => {
                            if (dataError?.field) {
                              newFieldErrs.push(dataError)
                            } else {
                              newNonFieldErrs.push(dataError)
                            }
                          })
                        }

                        return [
                          [...fieldErrs, ...newFieldErrs],
                          [...nonFieldErrs, ...newNonFieldErrs],
                        ]
                      },
                      [[], []],
                    )

                    dispatchFields({
                      type: 'ADD_SERVER_ERRORS',
                      errors: fieldErrors,
                    })

                    nonFieldErrors.forEach((err) => {
                      toast.error(err.message || i18n.t('error:unknown'))
                    })

                    setIsValid(false)
                    hideIndicator()
                    return
                  }
                } else {
                  // If it's not an error then we can update the document data inside the context
                  const document = json?.doc || json?.result

                  // Manually update the data since this function doesn't fire the `submit` function from useForm
                  if (document) {
                    setIsValid(true)
                    updateSavedDocumentData(document)
                  }
                }

                hideIndicator()
              }
            }
          }
        }
      },
      {
        afterProcess: () => {
          setBackgroundProcessing(false)
        },
        beforeProcess: () => {
          setBackgroundProcessing(true)
        },
      },
    )
  })

  const didMount = useRef(false)
  const previousDebouncedData = useRef(reduceFieldsToValues(debouncedFormState))

  // When debounced fields change, autosave
  useEffect(() => {
    /**
     * Ensure autosave doesn't run on mount
     */
    if (!didMount.current) {
      didMount.current = true
      return
    }

    /**
     * Ensure autosave only runs if the form data changes, not every time the entire form state changes
     * Remove `updatedAt` from comparison as it changes on every autosave interval.
     */
    const { updatedAt: _, ...formData } = reduceFieldsToValues(debouncedFormState)
    const { updatedAt: __, ...prevFormData } = previousDebouncedData.current

    if (dequal(formData, prevFormData)) {
      return
    }

    previousDebouncedData.current = formData

    handleAutosave()
  }, [debouncedFormState])

  /**
   * If component unmounts, clear the autosave timeout
   */
  useEffect(() => {
    return () => {
      stopAutoSaveIndicator()
    }
  }, [])

  const stopAutoSaveIndicator = useEffectEvent(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    setSaving(false)
  })

  return (
    <div className={baseClass}>
      {validateOnDraft && !isValid && <LeaveWithoutSaving />}
      {saving && t('general:saving')}
      {!saving && Boolean(lastUpdateTime) && (
        <React.Fragment>
          {t('version:lastSavedAgo', {
            distance: formatTimeToNow({ date: lastUpdateTime, i18n }),
          })}
        </React.Fragment>
      )}
    </div>
  )
}
