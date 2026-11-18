# Catálogo de produtos

Frontend estático em HTML, CSS e JavaScript, conectado ao backend Express/Supabase em outra instância AWS.

## Funcionalidades

- Cadastro de nome, descrição e preço via `POST /products`.
- Listagem com descrição, preço em reais e ID via `GET /products`.
- Botão **Atualizar** abre o formulário preenchido; **Salvar alterações** envia `PUT /products/:id`.
- Tela **Consultar por ID** usa `GET /products/:id` e permite atualizar ou excluir o resultado.
- Exclusão com confirmação via `DELETE /products/:id`.
- Layout responsivo, validação de campos e mensagens de resultado.

## Executar localmente

Na pasta do frontend, execute:

```sh
python3 -m http.server 8080
```

Abra `http://localhost:8080`. Não é necessário instalar dependências ou fazer build.

## Configurar as duas instâncias AWS

1. No arquivo `config.js`, ajuste `window.API_BASE_URL` para o endereço público do backend. O endereço preservado do projeto é `http://13.59.174.252:3000`.
2. Na instância do frontend, publique juntos `index.html`, `style.css`, `config.js` e `app.js` na pasta servida pelo Apache/Nginx. Os arquivos `style-old.css` e `stylev2.css` não são usados pela página.
3. Mantenha o backend Express rodando na outra instância, na porta 3000. O navegador do visitante precisa conseguir acessar esse endereço: verifique o Security Group e o firewall da instância do backend. `localhost` e IP privado não servem como URL pública para esse acesso.
4. O backend precisa permitir a origem do frontend via CORS. O `app.js` fornecido já habilita CORS. Se houver restrição de origem na versão implantada, configure a URL pública do frontend.
5. Se o frontend usar HTTPS, a API também deve usar HTTPS (por exemplo, por um proxy reverso); o navegador bloqueia chamadas HTTP feitas por uma página HTTPS.
6. As variáveis `SUPABASE_URL` e `SUPABASE_SECRET_KEY` ficam apenas no backend. Nenhuma chave do Supabase deve ser colocada no frontend.

O backend fornecido já recebe `description` tanto no cadastro quanto na atualização. A tabela `products` precisa conter as colunas `id`, `name`, `description` e `price`.

## Conferência da entrega

1. Cadastre um produto com descrição e preço; recarregue a página e confirme que os dados permanecem.
2. Clique em **Atualizar**, altere nome, descrição e preço e salve. Recarregue para conferir a persistência.
3. Copie o ID exibido e consulte na tela **Consultar por ID**. Consulte também um ID inexistente para conferir o estado vazio.
4. Exclua o produto de teste e confirme que ele desaparece do catálogo e da consulta.
5. Confira a interface em uma janela estreita ou no celular.

## Contrato e limitações do backend fornecido

As consultas retornam arrays JSON. As escritas retornam texto (`created!!`, `updated!!`, `deleted!!`); o frontend aceita ambos os formatos e reconhece objetos de erro do Supabase mesmo quando chegam com HTTP 200.

O backend fornecido deve idealmente usar `return res.status(400).json(error)` nos blocos de erro das escritas, para evitar enviar duas respostas. As consultas também devem tratar `error`. Além disso, o backend não confirma quantas linhas foram atualizadas/excluídas; se outro usuário excluir um produto durante a edição, ele pode responder sucesso sem alterar uma linha. Esses ajustes são do backend e não foram feitos nesta pasta do frontend.
