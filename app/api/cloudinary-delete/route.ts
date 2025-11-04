import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { public_id } = await request.json()

    console.log('Cloudinary delete request - public_id:', public_id)

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    console.log('=== Cloudinary Configuration Check ===')
    console.log('CloudName:', cloudName)
    console.log('API Key length:', apiKey?.length)
    console.log('API Secret length:', apiSecret?.length)

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary configuration!')
      return NextResponse.json(
        { error: 'Missing Cloudinary configuration' },
        { status: 500 }
      )
    }

    if (!public_id) {
      return NextResponse.json(
        { error: 'Missing public_id' },
        { status: 400 }
      )
    }

    // Generate timestamp
    const timestamp = Math.floor(Date.now() / 1000)

    // Create signature for deletion
    // Cloudinary signature only includes public_id and timestamp (NOT api_key)
    // Format: sha1(public_id=<value>&timestamp=<value><api_secret>)
    const stringToSign = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`

    console.log('=== Cloudinary Delete Signature ===')
    console.log('Public ID:', public_id)
    console.log('Timestamp:', timestamp)
    console.log('String to sign:', stringToSign)

    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')
    console.log('Generated signature:', signature)

    // Call Cloudinary API
    const formData = new FormData()
    formData.append('public_id', public_id)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)

    const deleteUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`
    console.log('Calling Cloudinary API:', deleteUrl)
    console.log('FormData contents:')
    console.log('  - public_id:', public_id)
    console.log('  - api_key:', apiKey)
    console.log('  - timestamp:', timestamp.toString())
    console.log('  - signature:', signature)

    const deleteResponse = await fetch(deleteUrl, {
      method: 'POST',
      body: formData,
    })

    console.log('Cloudinary response status:', deleteResponse.status)
    const responseText = await deleteResponse.text()
    console.log('Cloudinary response body:', responseText)

    if (!deleteResponse.ok) {
      console.error('Cloudinary delete error:', deleteResponse.status, responseText)
      return NextResponse.json(
        { error: 'Failed to delete image', details: responseText },
        { status: deleteResponse.status }
      )
    }

    const result = JSON.parse(responseText)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
