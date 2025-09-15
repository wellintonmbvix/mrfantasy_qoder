import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = 'static/uploads/products';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        
        if (!file) {
            return json({ error: 'Nenhuma imagem foi enviada' }, { status: 400 });
        }
        
        // Validar tipo de arquivo
        if (!ALLOWED_TYPES.includes(file.type)) {
            return json({ 
                error: 'Tipo de arquivo não permitido. Use JPG, JPEG, PNG ou WebP' 
            }, { status: 400 });
        }
        
        // Validar tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
            return json({ 
                error: 'Arquivo muito grande. Tamanho máximo: 5MB' 
            }, { status: 400 });
        }
        
        // Criar diretório se não existir
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, { recursive: true });
        }
        
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = path.extname(file.name);
        const fileName = `product_${timestamp}_${randomString}${extension}`;
        const filePath = path.join(UPLOAD_DIR, fileName);
        
        // Salvar arquivo
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        
        // Retornar URL da imagem
        const imageUrl = `/uploads/products/${fileName}`;
        
        return json({ 
            success: true, 
            imageUrl,
            message: 'Imagem enviada com sucesso'
        });
        
    } catch (error) {
        console.error('Erro no upload:', error);
        return json({ 
            error: 'Erro interno do servidor' 
        }, { status: 500 });
    }
};