from flask import Flask, request, jsonify,send_from_directory, redirect
from sqlalchemy import create_engine, Column, Integer, String, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from setup_db import User
from uuid import uuid4
from modulo import create_directory, Conv_PDF
app = Flask(__name__)


DATABASE_URL = "sqlite:///procjus.db"
engine = create_engine(DATABASE_URL, echo=False)  # Cria o objeto que sera utilizado para conectar ao SQLITE


@app.route('/', methods=['GET']) # Redireciona da raiz para a pagina home
def redirect_home():


    return redirect('/static/home.html')  


@app.route('/static/<path:filename>', methods=['GET']) # Serve todas as paginas publicas e arquivos estaticos
def serve_static(filename):

    return send_from_directory('static', filename)

@app.route('/static/area_do_cliente.html', methods=['GET']) # Serve a pagina da area do cliente
def area_do_cliente():
    
    session_cookie = request.cookies.get('session')
    

    Session = sessionmaker(bind=engine) 
    session = Session() # Conecta ao SQLITE

    user = session.query(User).filter_by(cookie=session_cookie).first() # Consulta se o usuario esta logado

    if user:
       # Caso ele esteja logado serve a pagina de area do cliente, caso nao esteja é redirecionado para a pagina de login
        session.close()
        return send_from_directory('static', "area_do_cliente.html")
    else:
        session.close()

        return redirect('/static/login.html') 



@app.route('/cadastrar', methods=['POST']) # Endpoint para cadastro do novo usuario
def cadastrar():


    json_data = request.get_json()

    email = json_data.get('email')
    password = json_data.get('password')
    cookie = str(uuid4())
    organization = None

    Session = sessionmaker(bind=engine)
    session = Session() # Conecta ao SQLITE
    
    new_user = User(password=password, organization=organization, cookie=cookie, email=email) # Cadastra o usuario no BD

    session.add(new_user)
    session.commit()
    session.close()
    return jsonify({'message': 'Usuario adicionado'}), 201

@app.route('/login', methods=['POST']) # Endpoint para login do usuario
def login(): 
    json_data = request.get_json()
    email = json_data.get('email')
    password = json_data.get('password')
    Session = sessionmaker(bind=engine)
    session = Session() # Conecta ao SQLITE

    user = session.query(User).filter_by(email=email).first() # Consulta no BD as informações associadas ao email inserido

    if user and user.password == password:
        # Caso exista um usuario com o email igual ao inserido cuja senha também é igual a inserida, retorna o valor do cookie desse usuario

        session.close()

        response = {'message': 'Login bem sucedido', 'cookie_value': user.cookie}
        return jsonify(response), 200
    else:
        # Caso o usuario nao exista ou a senha estiver errada ele nao consegue fazer login
        response = {'message': 'Credenciais incorretas'}
        return jsonify(response), 401


@app.route('/upload', methods=['POST']) # Endpoint para upload do arquivo que será resumido
def fazer_resumo():

    if 'file' not in request.files: # Verifica se a requisição possui um arquivo
        return 'Nenhum arquivo encontrado'

    file = request.files['file']

    
    if file.filename == '': # Verifica se o arquivo não está vazio
        return 'Arquivo vazio invalido'


    folder_hash = str(uuid4()) # Gera um UUID para criação de uma pasta com nome único
    create_directory(None, folder_hash) # Cria a pasta
    file.save('documentos/'+ folder_hash+ "/"+ file.filename) # Salva o arquivo que será resumido na pasta

    caminho_pdf = f"documentos/{folder_hash}/{file.filename}"
    caminho_txt = f"documentos/{folder_hash}/resumo_bard.txt" 

    
    converter = Conv_PDF(caminho_pdf, caminho_txt) # Instancia da classe Conv_PDF que será responsável por gerar o resumo
    
    resumo_texto = converter.converter_para_texto() # Gera o resumo

    if "não consigo te ajudar com isso" in resumo_texto: # Verifica se foi retornado um resumo invalido

        converter2 = Conv_PDF(caminho_pdf, caminho_txt)

        resumo_texto2 = converter2.converter_para_texto()

        return jsonify({"resumo": resumo_texto2}), 200 


    return jsonify({"resumo": resumo_texto}), 200 # Retorna o texto do resumo





if __name__ == '__main__':
    app.run(debug=True) # Inicia o servidor
