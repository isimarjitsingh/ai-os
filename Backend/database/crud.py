import json

from sqlalchemy.orm import Session, joinedload

from database.models import (
    User,
    Project,
    ResearchReport,
    MarketingReport,
    FinanceReport,
    CodingReport,
    CEOReport,
    GeneratedFile,
)


def _as_text(value):
    """
    Render a report field for its TEXT column without disguising its shape.

    These columns are plain TEXT, which is why list-shaped fields used to be
    written with str() - producing "['a', 'b']" for a real answer and the
    near-noise "[', ']" when a model replied with an empty array. JSON keeps
    the same information readable and machine-parseable, and leaves text,
    numbers and None exactly as they arrived.
    """

    if isinstance(value, (list, tuple, dict)):
        return json.dumps(list(value) if isinstance(value, tuple) else value,
                          ensure_ascii=False)

    return value


# ==========================================================
# USER
# ==========================================================

def get_user_by_email(
    db: Session,
    email: str
):
    return (
        db.query(User)
        .filter(User.email == email)
        .first()
    )


def get_user_by_id(
    db: Session,
    user_id: int
):
    return (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )


def create_user(
    db: Session,
    name: str,
    email: str,
    password_hash: str
):

    user = User(
        name=name,
        email=email,
        password_hash=password_hash
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ==========================================================
# PROJECT
# ==========================================================

def create_project(
    db: Session,
    thread_id: str,
    startup_idea: str,
    user_id: int,
):

    project = Project(
        thread_id=thread_id,
        startup_idea=startup_idea,
        user_id=user_id,
        status="running",
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


# ==========================================================
# GET PROJECT BY THREAD
# ==========================================================

def get_project_by_thread(
    db: Session,
    thread_id: str,
    user_id: int | None = None,
):

    query = (
        db.query(Project)
        .filter(Project.thread_id == thread_id)
    )

    if user_id is not None:

        query = query.filter(
            Project.user_id == user_id
        )

    return query.first()


# ==========================================================
# GET COMPLETE PROJECT
# ==========================================================

def get_complete_project(
    db: Session,
    thread_id: str,
    user_id: int | None = None,
):

    query = (
        db.query(Project)
        .options(
            joinedload(Project.research_report),
            joinedload(Project.marketing_report),
            joinedload(Project.finance_report),
            joinedload(Project.coding_report),
            joinedload(Project.ceo_report),
            joinedload(Project.generated_files),
        )
        .filter(
            Project.thread_id == thread_id
        )
    )

    if user_id is not None:

        query = query.filter(
            Project.user_id == user_id
        )

    return query.first()


# ==========================================================
# GET ALL USER PROJECTS
# ==========================================================

def get_all_projects(
    db: Session,
    user_id: int,
):

    return (
        db.query(Project)
        .filter(
            Project.user_id == user_id
        )
        .order_by(
            Project.created_at.desc()
        )
        .all()
    )


# ==========================================================
# UPDATE PROJECT NAME
# ==========================================================

def update_project_name(
    db: Session,
    thread_id: str,
    project_name: str,
    user_id: int,
):

    project = get_project_by_thread(
        db,
        thread_id,
        user_id
    )

    if not project:
        return None

    project.project_name = project_name

    db.commit()
    db.refresh(project)

    return project


# ==========================================================
# UPDATE PROJECT PATH
# ==========================================================

def update_project_path(
    db: Session,
    thread_id: str,
    generated_path: str,
    user_id: int,
):

    project = get_project_by_thread(
        db,
        thread_id,
        user_id
    )

    if not project:
        return None

    project.generated_path = generated_path

    db.commit()
    db.refresh(project)

    return project


# ==========================================================
# UPDATE PROJECT STATUS
# ==========================================================

def update_project_status(
    db: Session,
    thread_id: str,
    status: str,
    user_id: int,
):

    project = get_project_by_thread(
        db,
        thread_id,
        user_id
    )

    if not project:
        return None

    project.status = status

    db.commit()
    db.refresh(project)

    return project


# ==========================================================
# RESEARCH
# ==========================================================

def save_research_report(
    db,
    project,
    report
):

    research = ResearchReport(
        project_id=project.id,

        market_overview=report["market_overview"],

        target_audience=_as_text(report["target_audience"]),

        competitors=_as_text(report["competitors"]),

        key_features=_as_text(report["key_features"]),

        opportunities=_as_text(report["opportunities"]),

        risks=_as_text(report["risks"]),
    )

    db.add(research)
    db.commit()
    db.refresh(research)

    return research


# ==========================================================
# MARKETING
# ==========================================================

def save_marketing_report(
    db,
    project,
    report
):

    marketing = MarketingReport(
        project_id=project.id,

        marketing_summary=report[
            "marketing_summary"
        ],

        positioning=report[
            "positioning"
        ],

        target_channels=_as_text(report["target_channels"]),

        launch_strategy=_as_text(report["launch_strategy"]),

        content_ideas=_as_text(report["content_ideas"]),

        kpis=_as_text(report["kpis"]),
    )

    db.add(marketing)
    db.commit()
    db.refresh(marketing)

    return marketing


# ==========================================================
# FINANCE
# ==========================================================

def save_finance_report(
    db,
    project,
    report
):

    finance = FinanceReport(
        project_id=project.id,

        startup_cost=report[
            "startup_cost"
        ],

        monthly_cost=report[
            "monthly_cost"
        ],

        revenue_model=_as_text(report["revenue_model"]),

        pricing_strategy=report[
            "pricing_strategy"
        ],

        financial_risks=report[
            "financial_risks"
        ],

        break_even_estimate=report[
            "break_even_estimate"
        ],
    )

    db.add(finance)
    db.commit()
    db.refresh(finance)

    return finance


# ==========================================================
# CODING
# ==========================================================

def save_coding_report(
    db,
    project,
    report
):

    coding = CodingReport(
        project_id=project.id,

        project_name=report[
            "project_name"
        ],

        tech_stack=_as_text(report["tech_stack"]),

        frontend=_as_text(report["frontend"]),

        backend=_as_text(report["backend"]),

        database=report[
            "database"
        ],

        architecture=report[
            "architecture"
        ],

        core_features=_as_text(report["core_features"]),

        api_endpoints=_as_text(report["api_endpoints"]),

        development_steps=_as_text(report["development_steps"]),

        system_architecture=report[
            "system_architecture"
        ],
    )

    db.add(coding)
    db.commit()
    db.refresh(coding)

    return coding


# ==========================================================
# CEO
# ==========================================================

def save_ceo_report(
    db,
    project,
    report
):

    ceo = CEOReport(
        project_id=project.id,

        executive_summary=report[
            "executive_summary"
        ],

        business_viability=report[
            "business_viability"
        ],

        target_market=report[
            "target_market"
        ],

        unique_value_proposition=report[
            "unique_value_proposition"
        ],

        recommended_mvp=_as_text(report["recommended_mvp"]),

        recommended_tech_stack=_as_text(report["recommended_tech_stack"]),

        launch_strategy=report[
            "launch_strategy"
        ],

        estimated_budget=report[
            "estimated_budget"
        ],

        major_risks=_as_text(report["major_risks"]),

        next_steps=_as_text(report["next_steps"]),
    )

    db.add(ceo)
    db.commit()
    db.refresh(ceo)

    return ceo


# ==========================================================
# GENERATED FILES
# ==========================================================

def save_generated_file(
    db: Session,
    thread_id: str,
    file_path: str,
    category: str,
    user_id: int,
    contents: str | None = None,
):

    project = get_project_by_thread(
        db,
        thread_id,
        user_id
    )

    if not project:
        return None

    generated_file = GeneratedFile(
        project_id=project.id,
        file_path=file_path,
        category=category,
        contents=contents,
    )

    db.add(generated_file)
    db.commit()
    db.refresh(generated_file)

    return generated_file


# ==========================================================
# GET GENERATED FILES
# ==========================================================

def get_generated_files(
    db: Session,
    thread_id: str,
    user_id: int,
):

    project = get_project_by_thread(
        db,
        thread_id,
        user_id
    )

    if not project:
        return []

    return (
        db.query(GeneratedFile)
        .filter(
            GeneratedFile.project_id == project.id
        )
        .all()
    )


# ==========================================================
# GET SINGLE GENERATED FILE
# ==========================================================

def get_generated_file(
    db: Session,
    file_id: int,
    user_id: int,
):

    return (
        db.query(GeneratedFile)
        .join(Project)
        .filter(
            GeneratedFile.id == file_id,
            Project.user_id == user_id
        )
        .first()
    )


# ==========================================================
# DELETE GENERATED FILE
# ==========================================================

def delete_generated_file(
    db: Session,
    file_id: int,
    user_id: int,
):

    file = get_generated_file(
        db,
        file_id,
        user_id
    )

    if not file:
        return False

    db.delete(file)
    db.commit()

    return True