from sqlalchemy import create_engine, Column, Integer, String, Sequence
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid

DATABASE_URL = "sqlite:///procjus.db"
engine = create_engine(DATABASE_URL)  # Cria o objeto que sera utilizado para conectar ao SQLITE

# Define que será usada uma base declarativa
Base = declarative_base() 

# Define a classe da base que será utilizada/criada assim como seu esquema de campos e tipos
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, Sequence('user_id_seq'), primary_key=True)
    
    email = Column(String(50), unique=True)
    password = Column(String(50))
    organization = Column(String(50))
    cookie = Column(String(50))


# Cria a base e insere uma linha de teste nela
def setup_db():
	
	Base.metadata.create_all(engine)

	Session = sessionmaker(bind=engine)
	session = Session()

	new_user = User(email='teste@teste.com', password='senhateste', organization='teste_org', cookie=str(uuid.uuid4()))
	session.add(new_user)
	session.commit()

	queried_user = session.query(User).filter_by(email='teste@teste.com').first()
	print(f"USUARIO SELECIONADO: {queried_user.email} {queried_user.password}")

	session.close()
