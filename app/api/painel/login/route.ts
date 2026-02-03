import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    const user = {
      nome: email.split('@')[0],
      email: email,
      credits: 200,
    };

    return NextResponse.json({
      message: 'Login successful',
      token,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Error processing request' },
      { status: 500 }
    );
  }
}
