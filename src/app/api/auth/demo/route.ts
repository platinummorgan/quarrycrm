import { NextRequest, NextResponse } from 'next/server'
import { signIn } from 'next-auth/react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Demo token is required' },
      { status: 400 }
    )
  }

  try {
    // Check if user is already authenticated
    const session = await getServerSession(authOptions)

    if (session) {
      // If already authenticated, redirect to app
      return NextResponse.redirect(new URL('/app', request.url))
    }

    // For demo authentication, we need to handle it on the client side
    // Redirect to a demo signin page that will automatically sign in
    const demoSigninUrl = new URL('/auth/demo-signin', request.url)
    demoSigninUrl.searchParams.set('token', token)

    return NextResponse.redirect(demoSigninUrl)
  } catch (error) {
    console.error('Demo auth redirect error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=demo', request.url))
  }
}