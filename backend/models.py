import enum
import datetime
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database import Base
from pgvector.sqlalchemy import Vector

class RoleEnum(str, enum.Enum):
    admin = "admin"
    pm = "pm"
    engineer = "engineer"

class TicketCategoryEnum(str, enum.Enum):
    bug = "bug"
    feature = "feature"
    question = "question"
    spam = "spam"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    api_key = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="organization")
    tickets = relationship("Ticket", back_populates="organization")
    clusters = relationship("Cluster", back_populates="organization")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.engineer)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="users")

class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    summary = Column(String, nullable=False)
    severity = Column(String, default="medium")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="clusters")
    tickets = relationship("Ticket", back_populates="cluster")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=True)
    
    reporter_name = Column(String, nullable=True)
    reporter_email = Column(String, nullable=True)
    
    source = Column(String, default="manual")  # e.g. 'zendesk', 'manual'
    raw_content = Column(Text, nullable=False)
    category = Column(Enum(TicketCategoryEnum), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    urgency = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    status = Column(String, default="open")
    
    # Store the OpenAI text-embedding-3-small vector directly! Dimension is exactly 1536.
    embedding = Column(Vector(3072))
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    organization = relationship("Organization", back_populates="tickets")
    cluster = relationship("Cluster", back_populates="tickets")
