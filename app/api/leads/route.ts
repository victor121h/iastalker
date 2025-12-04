import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { primeiro_nome, segundo_nome, whatsapp, username_pesquisado } = body;

    if (!primeiro_nome || !segundo_nome || !whatsapp) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO leads (primeiro_nome, segundo_nome, whatsapp, username_pesquisado) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [primeiro_nome, segundo_nome, whatsapp, username_pesquisado || null]
    );

    return NextResponse.json({ 
      success: true, 
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar informações' },
      { status: 500 }
    );
  }
}
