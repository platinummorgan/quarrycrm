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

    // Redirect to NextAuth signin with demo provider
    const signInUrl = new URL('/api/auth/signin/demo', request.url)
    signInUrl.searchParams.set('token', token)
    signInUrl.searchParams.set('callbackUrl', '/app')

    return NextResponse.redirect(signInUrl)
  } catch (error) {
    console.error('Demo auth redirect error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=demo', request.url))
  }
}