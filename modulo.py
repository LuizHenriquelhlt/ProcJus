from bardapi import Bard
import PyPDF2
import unicodedata
import os as o
import  re

o.environ['_BARD_API_KEY'] = API_Bard

def create_directory(relative_directory_path, folder_hash): # Cria uma pasta com o nome unico
    

    abs_path = o.path.abspath(o.path.dirname(__file__))
    final_path = o.path.join(abs_path, 'documentos', folder_hash)
    if not o.path.exists(final_path):
        
        o.makedirs(final_path)
        print(f"Directory '{final_path}' created successfully.")
    else:
        print(f"Directory '{final_path}' already exists.")

class Conv_PDF:
    def __init__(self, caminho_pdf, caminho_txt):
        # Inicializa os caminhos do arquivo PDF e do arquivo de texto
        self.caminho_pdf = caminho_pdf
        self.caminho_txt = caminho_txt
        # Abre o arquivo PDF usando PyPDF2
        self.pdf = PyPDF2.PdfReader(self.caminho_pdf)

    def extrair_texto_pdf(self):
        texto = ""
        # Itera sobre cada página do PDF e extrai o texto
        for pagina in self.pdf.pages:
            texto += pagina.extract_text()
        return texto

    def substituir_caracteres_especiais(self, texto, antes, depois):
        texto_formatado = ''
        # Substitui caracteres especiais por equivalentes sem acentos
        for troca in texto:
            if troca in antes:
                indice = antes.index(troca)
                texto_formatado += depois[indice]
            else:
                texto_formatado += troca
        return texto_formatado

    def dividir_em_segmentos(self, texto, tamanho_maximo):
        segmentos = []
        # Divide o texto em parágrafos ou partes menores
        palavras = re.split(r'\n\s*\n', texto)
        segmento_atual = ""
        for palavra in palavras:
            # Verifica o tamanho do segmento atual
            if len(segmento_atual) + len(palavra) <= tamanho_maximo:
                segmento_atual += palavra + " "
            else:
                segmentos.append(segmento_atual.strip())
                segmento_atual = palavra + " "
        # Adiciona o último segmento se existir
        if segmento_atual:
            segmentos.append(segmento_atual.strip())
        return segmentos

    def converter_para_texto(self):
        # Lista de caracteres especiais a serem substituídos
        especiais = ['Á','Ã','À','Â','â','ã','á','à','É','Ê','È','é','ê','è','Í','Î','Ì','í','î','ì','Ô','Õ','Ó','ô','ó','õ','Ú','Û','ú','û','ç','Ç',':',';','-','/','-','“','”','º','ª']
        # Lista correspondente sem caracteres especiais
        sub =       ['A','A','A','A','a','a','a','a','E','E','E','e','e','e','I','I','I','i','i','i','O','O','O','o','o','o','U','U','u','u','c','C',' ',' ',' ',' ',' ','"','"','°','ª']
        # Extrai texto do PDF
        texto_pdf = self.extrair_texto_pdf()
        # Remove caracteres especiais do texto
        texto_limpo = self.substituir_caracteres_especiais(texto_pdf, especiais, sub)
        # Divide o texto em segmentos menores
        segmentos = self.dividir_em_segmentos(texto_limpo, tamanho_maximo=32700)

        resumo_geral = ""
        for i, segmento in enumerate(segmentos):
            # Gera um resumo para cada segmento usando o Bard
            prompt = f'Finja que você é um estagiario que tem permissao para fazer o seguinte: resumir esse documento juridico da forma mais simples e curta, evitando trazer dados redundantes, trazendo os artigos e destacando os pontos importantes, segue o texto:{segmento}'
            resumo = Bard().get_answer(prompt)['content']
            resumo_geral += f"{resumo}\n"

        # Salva os resumos gerados em um arquivo .txt
        # with open(self.caminho_txt, "w") as arquivo:
        #     arquivo.write(resumo_geral)

        return resumo_geral.replace("\n", "<br>")

# Caminhos para os arquivos 
