from sqlalchemy.orm import Session, joinedload

from database.models import (
    Project,
    ResearchReport,
    MarketingReport,
    FinanceReport,
    CodingReport,
    CEOReport,
    GeneratedFile,
)


# ==========================================================
# PROJECT
# ==========================================================

def create_project(
    db: Session,
    thread_id: str,
    startup_idea: str,
):
    project = Project(
        thread_id=thread_id,
        startup_idea=startup_idea,
        status="running",
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def get_project_by_thread(
    db: Session,
    thread_id: str,
):
    return (
        db.query(Project)
        .filter(Project.thread_id == thread_id)
        .first()
    )


def get_complete_project(
    db: Session,
    thread_id: str,
):
    return (
        db.query(Project)
        .options(
            joinedload(Project.research_report),
            joinedload(Project.marketing_report),
            joinedload(Project.finance_report),
            joinedload(Project.coding_report),
            joinedload(Project.ceo_report),
            joinedload(Project.generated_files),
        )
        .filter(Project.thread_id == thread_id)
        .first()
    )


def get_all_projects(
    db: Session,
):
    return (
        db.query(Project)
        .order_by(Project.created_at.desc())
        .all()
    )


# ==========================================================
# UPDATE PROJECT
# ==========================================================

def update_project_name(
    db: Session,
    thread_id: str,
    project_name: str,
):
    project = get_project_by_thread(db, thread_id)

    if not project:
        return None

    project.project_name = project_name

    db.commit()
    db.refresh(project)

    return project


def update_project_path(
    db: Session,
    thread_id: str,
    generated_path: str,
):
    project = get_project_by_thread(db, thread_id)

    if not project:
        return None

    project.generated_path = generated_path

    db.commit()
    db.refresh(project)

    return project


def update_project_status(
    db: Session,
    thread_id: str,
    status: str,
):
    project = get_project_by_thread(db, thread_id)

    if not project:
        return None

    project.status = status

    db.commit()
    db.refresh(project)

    return project


# ==========================================================
# RESEARCH
# ==========================================================

def save_research_report(db, project, report):

    research = ResearchReport(
        project_id=project.id,
        market_overview=report["market_overview"],
        target_audience=str(report["target_audience"]),
        competitors=str(report["competitors"]),
        key_features=str(report["key_features"]),
        opportunities=str(report["opportunities"]),
        risks=str(report["risks"]),
    )

    db.add(research)
    db.commit()
    db.refresh(research)

    return research


# ==========================================================
# MARKETING
# ==========================================================

def save_marketing_report(db, project, report):

    marketing = MarketingReport(
        project_id=project.id,
        marketing_summary=report["marketing_summary"],
        positioning=report["positioning"],
        target_channels=str(report["target_channels"]),
        launch_strategy=str(report["launch_strategy"]),
        content_ideas=str(report["content_ideas"]),
        kpis=str(report["kpis"]),
    )

    db.add(marketing)
    db.commit()
    db.refresh(marketing)

    return marketing


# ==========================================================
# FINANCE
# ==========================================================

def save_finance_report(db, project, report):

    finance = FinanceReport(
        project_id=project.id,
        startup_cost=report["startup_cost"],
        monthly_cost=report["monthly_cost"],
        revenue_model=str(report["revenue_model"]),
        pricing_strategy=report["pricing_strategy"],
        financial_risks=str(report["financial_risks"]),
        break_even_estimate=report["break_even_estimate"],
    )

    db.add(finance)
    db.commit()
    db.refresh(finance)

    return finance


# ==========================================================
# CODING
# ==========================================================

def save_coding_report(db, project, report):

    coding = CodingReport(
        project_id=project.id,
        project_name=report["project_name"],
        tech_stack=str(report["tech_stack"]),
        frontend=str(report["frontend"]),
        backend=str(report["backend"]),
        database=report["database"],
        architecture=report["architecture"],
        core_features=str(report["core_features"]),
        api_endpoints=str(report["api_endpoints"]),
        development_steps=str(report["development_steps"]),
        system_architecture=report["system_architecture"],
    )

    db.add(coding)
    db.commit()
    db.refresh(coding)

    return coding


# ==========================================================
# CEO
# ==========================================================

def save_ceo_report(db, project, report):

    ceo = CEOReport(
        project_id=project.id,
        executive_summary=report["executive_summary"],
        business_viability=report["business_viability"],
        target_market=report["target_market"],
        unique_value_proposition=report["unique_value_proposition"],
        recommended_mvp=str(report["recommended_mvp"]),
        recommended_tech_stack=str(report["recommended_tech_stack"]),
        launch_strategy=str(report["launch_strategy"]),
        estimated_budget=report["estimated_budget"],
        major_risks=str(report["major_risks"]),
        next_steps=str(report["next_steps"]),
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
):

    project = get_project_by_thread(db, thread_id)

    if not project:
        return None

    generated_file = GeneratedFile(
        project_id=project.id,
        file_path=file_path,
        category=category,
    )

    db.add(generated_file)
    db.commit()
    db.refresh(generated_file)

    return generated_file


def get_generated_files(
    db: Session,
    thread_id: str,
):

    project = get_project_by_thread(db, thread_id)

    if not project:
        return []

    return (
        db.query(GeneratedFile)
        .filter(GeneratedFile.project_id == project.id)
        .all()
    )


def get_generated_file(
    db: Session,
    file_id: int,
):
    return (
        db.query(GeneratedFile)
        .filter(GeneratedFile.id == file_id)
        .first()
    )


def delete_generated_file(
    db: Session,
    file_id: int,
):

    file = get_generated_file(db, file_id)

    if not file:
        return False

    db.delete(file)
    db.commit()

    return True