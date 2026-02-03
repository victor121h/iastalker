import { NextRequest, NextResponse } from 'next/server';

const users: Map<string, { nome: string; email: string; senha: string; credits: number }> = new Map();

export async function POST(request: NextRequest) {
  try {
    const { nome, email, senha } = await request.json();

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (users.has(email)) {
      return NextResponse.json(
        { message: 'Email already registered', existingUser: true },
        { status: 409 }
      );
    }

    users.set(email, {
      nome,
      email,
      senha,
      credits: 200,
    });

    return NextResponse.json(
      { message: 'Account created successfully' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Error processing request' },
      { status: 500 }
    );
  }
}
