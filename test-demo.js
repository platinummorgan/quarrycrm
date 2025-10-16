import { signIn } from 'next-auth/react'

async function testDemoSignin() {
  const token = 'eyJhbGciOiJIUzI1NiJ9.eyJvcmdJZCI6ImNtZ3NpZTBlbDAwMDBnYnVwb2d1YmJvaDAiLCJyb2xlIjoiZGVtbyIsImlhdCI6MTc2MDU3Njk0NiwiZXhwIjoxNzYwNTc3ODQ2LjM0OH0.yurJQO4zPgaZGekRyXQk45AcYHt4-DprpYxdgYJZiVw'

  console.log('Testing demo signin...')
  const result = await signIn('demo', {
    token,
    redirect: false,
  })

  console.log('Result:', result)
}

testDemoSignin()