import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { Buffer } from 'buffer'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
const attachmentsBucket = process.env.SUPABASE_INQUIRY_BUCKET || 'inquiry-attachments'

const maxAttachmentCount = Math.max(0, Number(process.env.INQUIRY_MAX_ATTACHMENTS ?? '3'))
const maxAttachmentSize = Math.max(0, Number(process.env.INQUIRY_MAX_ATTACHMENT_SIZE ?? `${5 * 1024 * 1024}`))
const signedUrlTtlSeconds = Math.max(30, Number(process.env.INQUIRY_SIGNED_URL_TTL ?? `${60 * 60}`))

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

interface AttachmentRow {
  name: string
  path: string
  size: number
  contentType: string
}

interface AttachmentResponse extends AttachmentRow {
  url: string
}

interface SupabaseInquiryRow {
  id: string
  title: string
  content: string
  status: string
  response?: string | null
  created_at: string
  responded_at?: string | null
  updated_at?: string | null
  attachments?: AttachmentRow[] | null
  last_viewed_at?: string | null
  status_changed_at?: string | null
}

const getNumericUserId = (request: NextRequest): { response: NextResponse | null; userId: number | null } => {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }), userId: null }
  }

  const numericUserId = Number(userId)
  if (!Number.isInteger(numericUserId)) {
    return {
      response: NextResponse.json({ error: '올바른 사용자 식별자가 아닙니다.' }, { status: 400 }),
      userId: null,
    }
  }

  return { response: null as NextResponse | null, userId: numericUserId }
}

const normalizeStatus = (status: string | null | undefined): string => {
  const candidate = (status || '').toLowerCase()
  if (candidate === 'pending' || candidate === 'in_progress' || candidate === 'resolved') {
    return candidate
  }
  return 'pending'
}

const cleanupUploadedFiles = async (paths: string[]) => {
  if (!paths.length) {
    return
  }

  try {
    await supabaseAdmin.storage.from(attachmentsBucket).remove(paths)
  } catch (cleanupError) {
    console.error('Attachment cleanup failed:', cleanupError)
  }
}

const uploadAttachments = async (files: File[], userId: number): Promise<AttachmentRow[]> => {
  if (!files.length || maxAttachmentCount <= 0) {
    return []
  }

  if (files.length > maxAttachmentCount) {
    throw new Error('TOO_MANY_ATTACHMENTS')
  }

  const uploaded: AttachmentRow[] = []
  const storedPaths: string[] = []

  for (const file of files) {
    if (!(file instanceof File)) {
      continue
    }

    if (file.size === 0) {
      continue
    }

    if (maxAttachmentSize > 0 && file.size > maxAttachmentSize) {
      await cleanupUploadedFiles(storedPaths)
      throw new Error('ATTACHMENT_TOO_LARGE')
    }

    const originalName = file.name || 'attachment'
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-')
    const uniquePath = `${userId}/${randomUUID()}-${sanitizedName}`

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const { error } = await supabaseAdmin.storage
        .from(attachmentsBucket)
        .upload(uniquePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (error) {
        throw error
      }

      storedPaths.push(uniquePath)
      uploaded.push({
        name: originalName,
        path: uniquePath,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
      })
    } catch (uploadError) {
      console.error('Attachment upload error:', uploadError)
      await cleanupUploadedFiles(storedPaths)
      throw new Error('ATTACHMENT_UPLOAD_FAILED')
    }
  }

  return uploaded
}

const signAttachments = async (attachments: AttachmentRow[] | null | undefined): Promise<AttachmentResponse[]> => {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return []
  }

  const signed = await Promise.all(
    attachments.map(async (item) => {
      if (!item || typeof item.path !== 'string') {
        return null
      }

      try {
        const { data, error } = await supabaseAdmin.storage
          .from(attachmentsBucket)
          .createSignedUrl(item.path, signedUrlTtlSeconds)

        if (error || !data?.signedUrl) {
          const { data: publicData } = supabaseAdmin.storage.from(attachmentsBucket).getPublicUrl(item.path)
          if (!publicData?.publicUrl) {
            throw error || new Error('SIGNED_URL_FAILED')
          }

          return {
            ...item,
            url: publicData.publicUrl,
          }
        }

        return {
          ...item,
          url: data.signedUrl,
        }
      } catch (signError) {
        console.error('Attachment sign error:', signError)
        return null
      }
    })
  )

  return signed.filter((entry): entry is AttachmentResponse => Boolean(entry))
}

const formatInquiryRow = async (row: SupabaseInquiryRow) => {
  return {
    ...row,
    status: normalizeStatus(row.status),
    attachments: await signAttachments(row.attachments),
  }
}

export async function GET(request: NextRequest) {
  const { userId, response } = getNumericUserId(request)
  if (response) {
    return response
  }
  if (userId === null) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status')

  try {
    let query = supabaseAdmin
      .from('user_inquiries')
      .select(
        'id, title, content, status, response, created_at, responded_at, updated_at, attachments, image_url, last_viewed_at, status_changed_at'
      )
      .eq('user_id', userId)

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', normalizeStatus(statusFilter))
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch inquiries:', error)
      return NextResponse.json({ error: '문의 기록을 불러오지 못했습니다.' }, { status: 500 })
    }

    const formatted = await Promise.all((data || []).map(formatInquiryRow))
    return NextResponse.json({ inquiries: formatted })
  } catch (fetchError) {
    console.error('Unexpected inquiry fetch error:', fetchError)
    return NextResponse.json({ error: '문의 기록을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { userId, response } = getNumericUserId(request)
  if (response) {
    return response
  }
  if (userId === null) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const title = formData.get('title')
    const content = formData.get('content')
    const imageUrl = formData.get('image_url')
    const files = formData.getAll('attachments').filter((value): value is File => value instanceof File && value.size > 0)

    const trimmedTitle = typeof title === 'string' ? title.trim() : ''
    const trimmedContent = typeof content === 'string' ? content.trim() : ''

    if (!trimmedTitle || !trimmedContent) {
      return NextResponse.json({ error: '제목과 내용을 모두 입력해 주세요.' }, { status: 400 })
    }

    if (trimmedTitle.length > 150) {
      return NextResponse.json({ error: '제목은 150자 이내로 작성해 주세요.' }, { status: 400 })
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json({ error: '내용은 2000자 이내로 작성해 주세요.' }, { status: 400 })
    }

    let attachments: AttachmentRow[] = []

    if (files.length) {
      try {
        attachments = await uploadAttachments(files, userId)
      } catch (uploadError) {
        if (uploadError instanceof Error) {
          if (uploadError.message === 'TOO_MANY_ATTACHMENTS') {
            return NextResponse.json(
              { error: `첨부 파일은 최대 ${maxAttachmentCount}개까지 업로드할 수 있습니다.` },
              { status: 400 }
            )
          }

          if (uploadError.message === 'ATTACHMENT_TOO_LARGE') {
            return NextResponse.json(
              {
                error: `첨부 파일은 파일당 ${(maxAttachmentSize / (1024 * 1024)).toFixed(1)}MB 이하로 업로드해 주세요.`,
              },
              { status: 400 }
            )
          }
        }

        return NextResponse.json({ error: '첨부 파일 업로드에 실패했습니다.' }, { status: 500 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_inquiries')
      .insert([
        {
          user_id: userId,
          title: trimmedTitle,
          content: trimmedContent,
          status: 'pending',
          attachments,
          image_url: typeof imageUrl === 'string' ? imageUrl : null,
          last_viewed_at: new Date().toISOString(),
        },
      ])
      .select(
        'id, title, content, status, response, created_at, responded_at, updated_at, attachments, image_url, last_viewed_at, status_changed_at'
      )
      .single()

    if (error || !data) {
      console.error('Failed to create inquiry:', error)
      await cleanupUploadedFiles(attachments.map((item) => item.path))
      return NextResponse.json({ error: '문의 등록에 실패했습니다.' }, { status: 500 })
    }

    const inquiry = await formatInquiryRow(data)
    return NextResponse.json({ inquiry }, { status: 201 })
  } catch (exception) {
    console.error('Unexpected inquiry create error:', exception)
    return NextResponse.json({ error: '문의 등록에 실패했습니다.' }, { status: 500 })
  }
}
