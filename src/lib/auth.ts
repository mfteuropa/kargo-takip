import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'gizli-anahtar-degistir'
const key = new TextEncoder().encode(secretKey)

export async function sign(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(key)
}

export async function verify(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (error) {
    return null
  }
}
