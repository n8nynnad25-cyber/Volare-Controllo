# Padrão para Criação de Utilizadores no Supabase

Para que o sistema **Volare** atribua as permissões corretas automaticamente, é necessário definir o campo `role` nos metadados do utilizador no Supabase.

## Como Criar um Utilizador (Novo Método Simplificado)
 
 1. Faça login como **Administrador**.
 2. Aceda ao menu **Configurações**.
 3. Clique na aba **Utilizadores (Login)**.
 4. Preencha o Nome, Email, Senha e selecione o Cargo.
 5. Clique em **Criar Utilizador**.
 
 O sistema criará automaticamente o login com as permissões corretas.
 
 ## Como Criar um Utilizador (Método Manual via Supabase Dashboard)
 
 Se preferir usar o painel do Supabase:
 
 1. Aceda ao seu projeto no [Supabase Dashboard](https://supabase.com/dashboard).
 2. No menu lateral, clique em **Authentication**.
 3. Clique em **Users**.
 4. Clique no botão **Add User** (ou "Invite User").
 5. Preencha o **Email** e a **Password**.
 6. **IMPORTANTE:** No campo **User Metadata** (ou JSON Data), insira a estrutura correspondente ao tipo de utilizador:
 
 ### 🛡️ Administrador (Acesso Total)
 Pode ver, criar, editar, apagar e configurar tudo.
 ```json
 {
   "name": "João Silva",
   "role": "admin",
   "avatar_url": "https://example.com/foto.jpg"
 }
 ```
 
 ### 💼 Gerente / Operacional (Ver, Criar e Editar)
 Pode operar o dia-a-dia e corrigir erros, mas **NÃO** pode apagar dados permanentemente nem aceder às configurações.
 ```json
 {
   "name": "Maria Costa",
   "role": "manager"
 }
 ```
 
 ### 👁️ Boss (Visualização + Chatbot)
 Apenas visualiza dados e usa o Chatbot IA. Não pode alterar nada.
 ```json
 {
   "name": "Carlos Chefe",
   "role": "boss"
 }
 ```
 
 ## Notas Técnicas
 
 *   O sistema é insensível a maiúsculas/minúsculas (ex: `Admin`, `ADMIN`, `admin` funcionam todos).
 *   Se o campo `role` não for definido, o sistema atribuirá o perfil **Manager** por defeito.
 *   O campo `avatar_url` é opcional. Se não for fornecido, será gerado um avatar com as iniciais.
