import { Html, Head, Body, Container, Heading, Text, Button, Link, Hr } from '@react-email/components'

interface MagicLinkEmailProps {
  url: string
  host: string
}

export default function MagicLinkEmail({ url, host }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', padding: '20px' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' }}>
          <Heading style={{ color: '#333', textAlign: 'center' }}>Welcome to QuarryCRM</Heading>
          
          <Text style={{ fontSize: '16px', color: '#555', lineHeight: '1.5' }}>
            Hi there,
          </Text>
          
          <Text style={{ fontSize: '16px', color: '#555', lineHeight: '1.5' }}>
            Click the button below to sign in to your QuarryCRM account. This link will expire in 24 hours.
          </Text>
          
          <Button 
            href={url}
            style={{ 
              backgroundColor: '#007bff', 
              color: '#ffffff', 
              padding: '12px 24px', 
              textDecoration: 'none', 
              borderRadius: '4px', 
              display: 'inline-block',
              margin: '20px 0'
            }}
          >
            Sign In to QuarryCRM
          </Button>
          
          <Hr style={{ borderColor: '#ddd', margin: '20px 0' }} />
          
          <Text style={{ fontSize: '14px', color: '#777' }}>
            If the button doesn't work, copy and paste this link into your browser:
          </Text>
          
          <Link href={url} style={{ color: '#007bff', wordBreak: 'break-all' }}>
            {url}
          </Link>
          
          <Text style={{ fontSize: '14px', color: '#777', marginTop: '20px' }}>
            If you didn't request this email, you can safely ignore it.
          </Text>
          
          <Text style={{ fontSize: '12px', color: '#999', textAlign: 'center', marginTop: '30px' }}>
            © 2025 QuarryCRM. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}