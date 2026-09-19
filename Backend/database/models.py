from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey
)

from sqlalchemy.orm import relationship

from sqlalchemy.sql import func

from database import Base


# ==========================================================
# API KEYS
# ==========================================================

class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, unique=True, nullable=False, index=True)
    api_key = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


# ==========================================================
# USER
# ==========================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete"
    )


# ==========================================================
# PROJECT
# ==========================================================

class Project(Base):

    __tablename__ = "projects"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    thread_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    # ======================================================
    # OWNER
    # ======================================================

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    user = relationship(
        "User",
        back_populates="projects"
    )

    project_name = Column(
        String,
        nullable=True
    )

    startup_idea = Column(
        Text,
        nullable=False
    )

    api_key = Column(
        Text,
        nullable=True
    )

    status = Column(
        String,
        default="running"
    )

    generated_path = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    research_report = relationship(
        "ResearchReport",
        back_populates="project",
        uselist=False,
        cascade="all, delete"
    )

    marketing_report = relationship(
        "MarketingReport",
        back_populates="project",
        uselist=False,
        cascade="all, delete"
    )

    finance_report = relationship(
        "FinanceReport",
        back_populates="project",
        uselist=False,
        cascade="all, delete"
    )

    coding_report = relationship(
        "CodingReport",
        back_populates="project",
        uselist=False,
        cascade="all, delete"
    )

    ceo_report = relationship(
        "CEOReport",
        back_populates="project",
        uselist=False,
        cascade="all, delete"
    )

    generated_files = relationship(
        "GeneratedFile",
        back_populates="project",
        cascade="all, delete"
    )


# ==========================================================
# RESEARCH
# ==========================================================

class ResearchReport(Base):

    __tablename__ = "research_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    market_overview = Column(Text)
    target_audience = Column(Text)
    competitors = Column(Text)
    key_features = Column(Text)
    opportunities = Column(Text)
    risks = Column(Text)

    project = relationship(
        "Project",
        back_populates="research_report"
    )


# ==========================================================
# MARKETING
# ==========================================================

class MarketingReport(Base):

    __tablename__ = "marketing_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    marketing_summary = Column(Text)
    positioning = Column(Text)
    target_channels = Column(Text)
    launch_strategy = Column(Text)
    content_ideas = Column(Text)
    kpis = Column(Text)

    project = relationship(
        "Project",
        back_populates="marketing_report"
    )


# ==========================================================
# FINANCE
# ==========================================================

class FinanceReport(Base):

    __tablename__ = "finance_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    startup_cost = Column(Text)
    monthly_cost = Column(Text)
    revenue_model = Column(Text)
    pricing_strategy = Column(Text)
    financial_risks = Column(Text)
    break_even_estimate = Column(Text)

    project = relationship(
        "Project",
        back_populates="finance_report"
    )


# ==========================================================
# CODING
# ==========================================================

class CodingReport(Base):

    __tablename__ = "coding_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    project_name = Column(Text)
    tech_stack = Column(Text)
    frontend = Column(Text)
    backend = Column(Text)
    database = Column(Text)
    architecture = Column(Text)
    core_features = Column(Text)
    api_endpoints = Column(Text)
    development_steps = Column(Text)
    system_architecture = Column(Text)

    project = relationship(
        "Project",
        back_populates="coding_report"
    )


# ==========================================================
# CEO
# ==========================================================

class CEOReport(Base):

    __tablename__ = "ceo_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    executive_summary = Column(Text)
    business_viability = Column(Text)
    target_market = Column(Text)
    unique_value_proposition = Column(Text)
    recommended_mvp = Column(Text)
    recommended_tech_stack = Column(Text)
    launch_strategy = Column(Text)
    estimated_budget = Column(Text)
    major_risks = Column(Text)
    next_steps = Column(Text)

    project = relationship(
        "Project",
        back_populates="ceo_report"
    )


# ==========================================================
# GENERATED FILES
# ==========================================================

class GeneratedFile(Base):

    __tablename__ = "generated_files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    file_path = Column(
        Text,
        nullable=False
    )

    category = Column(
        String,
        nullable=False
    )

    # The generated file's actual text. This used to be the only column missing
    # from the row: routes/files.py rebuilt the preview by reading
    # Backend/generated_projects/<name>/ off the local disk, which is a
    # container's temporary filesystem on a hosted app platform. Every project
    # previewed fine until the first redeploy or scale-up, then the database
    # still listed the files while the bytes were gone and the endpoint answered
    # "Generated files exist in database but could not be read from disk".
    # Storing the content here makes Postgres the source of truth and the disk a
    # development convenience.
    contents = Column(
        Text,
        nullable=True
    )

    project = relationship(
        "Project",
        back_populates="generated_files"
    )