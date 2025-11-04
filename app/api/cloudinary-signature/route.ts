import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing Cloudinary configuration' },
        { status: 500 }
      )
    }

    // Generate timestamp
    const timestamp = Math.floor(Date.now() / 1000)

    // Create signature
    // Parameters must be in alphabetical order with api_secret appended
    // Format: sha1(folder=instagram-sns&timestamp=<timestamp><api_secret>)
    const stringToSign = `folder=instagram-sns&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex')

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
    })
  } catch (error) {
    console.error('Signature generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate signature' },
      { status: 500 }
    )
  }
}
