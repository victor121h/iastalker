import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received lead data:', body);
    
    const { primeiro_nome, segundo_nome, whatsapp, username_pesquisado } = body;

    if (!primeiro_nome || !segundo_nome || !whatsapp) {
      console.log('Missing fields:', { primeiro_nome, segundo_nome, whatsapp });
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

    console.log('Lead saved successfully:', result.rows[0].id);

    return NextResponse.json({ 
      success: true, 
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar informações', details: String(error) },
      { status: 500 }
    );
  }
}
