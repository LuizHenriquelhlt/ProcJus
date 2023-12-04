from flask import Flask, request, jsonify,send_from_directory, redirect
from sqlalchemy import create_engine, Column, Integer, String, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from setup_db import User
from uuid import uuid4
from modulo import create_directory, Conv_PDF
app = Flask(__name__)

# Define the database engine
DATABASE_URL = "sqlite:///procjus.db"
engine = create_engine(DATABASE_URL, echo=False)  # Set echo to True to see SQL queries

# Create a session to interact with the database

@app.route('/static/<path:filename>', methods=['GET'])
def serve_static(filename):

    return send_from_directory('static', filename)

@app.route('/static/area_do_cliente.html', methods=['GET'])
def area_do_cliente():
    
    session_cookie = request.cookies.get('session')
    

    Session = sessionmaker(bind=engine)
    session = Session()
    # Check if the session cookie matches the cookie_value of any user in the table
    user = session.query(User).filter_by(cookie=session_cookie).first()

    if user:
        # Session is valid, serve the page
        return send_from_directory('static', "area_do_cliente.html")
    else:
        # Session is invalid, redirect to login page
        return redirect('/static/login.html')  # You can replace '/login' with the appropriate login route



@app.route('/cadastrar', methods=['POST'])
def cadastrar():


    json_data = request.get_json()

    email = json_data.get('email')
    password = json_data.get('password')
    cookie = str(uuid4())
    organization = None

    Session = sessionmaker(bind=engine)
    session = Session()
    
    new_user = User(password=password, organization=organization, cookie=cookie, email=email)

    session.add(new_user)
    session.commit()
    session.close()
    return jsonify({'message': 'Usuario adicionado'}), 201

@app.route('/login', methods=['POST'])
def login():
    json_data = request.get_json()
    email = json_data.get('email')
    password = json_data.get('password')
    Session = sessionmaker(bind=engine)
    session = Session()
    # Retrieve user by email from the database
    user = session.query(User).filter_by(email=email).first()

    if user and user.password == password:
        # Password is correct
        response = {'message': 'Login successful', 'cookie_value': user.cookie}
        return jsonify(response), 200
    else:
        # Invalid credentials
        response = {'message': 'Invalid credentials'}
        return jsonify(response), 401


@app.route('/upload', methods=['POST'])
def fazer_resumo():
    # Check if the post request has the file part
    if 'file' not in request.files:
        return 'No file part'

    file = request.files['file']

    # If the user submits an empty file input, ignore it
    if file.filename == '':
        return 'No selected file'

    # Save the uploaded file to a specific location (you can customize the path)
    folder_hash = str(uuid4())
    create_directory(None, folder_hash)
    file.save('documentos/'+ folder_hash+ "/"+ file.filename)

    caminho_pdf = f"documentos/{folder_hash}/{file.filename}"
    caminho_txt = f"documentos/{folder_hash}/resumo_bard.txt" 

    # Cria uma instância da classe Conv_PDF com os caminhos especificados
    converter = Conv_PDF(caminho_pdf, caminho_txt)
    # Inicia o processo de conversão do PDF para texto e geração de resumos
    resumo_texto = converter.converter_para_texto()

    if "não consigo te ajudar com isso" in resumo_texto:

        converter2 = Conv_PDF(caminho_pdf, caminho_txt)
        # Inicia o processo de conversão do PDF para texto e geração de resumos
        resumo_texto2 = converter2.converter_para_texto()

        return jsonify({"resumo": resumo_texto2}), 200


    return jsonify({"resumo": resumo_texto}), 200





if __name__ == '__main__':
    app.run(debug=True)
