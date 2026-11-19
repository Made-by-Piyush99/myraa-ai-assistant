"""
Coding assistance: create code files, run Python scripts, scaffold projects.

  createPythonFile   -> write a .py file (uses createFile semantics w/ safety)
  writeCodeFile      -> write an arbitrary-language file with proper extension
  createProjectFolder-> make a folder structure (with optional subfolders)
  runPythonScript    -> execute a .py file with the known-good interpreter,
                        capturing stdout/stderr and exit code.

The Python interpreter used for running scripts is auto-detected so it works
even when the bare `python` shim is broken (common on this machine).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from .registry import ToolError, register
from .tools_files import _ensure_safe


# Extension map for writeCodeFile.
LANG_EXT: Dict[str, str] = {
    "python": "py",
    "py": "py",
    "javascript": "js",
    "js": "js",
    "typescript": "ts",
    "ts": "ts",
    "html": "html",
    "css": "css",
    "json": "json",
    "markdown": "md",
    "md": "md",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "csharp": "cs",
    "cs": "cs",
    "go": "go",
    "rust": "rs",
    "rs": "rs",
    "ruby": "rb",
    "rb": "rb",
    "php": "php",
    "shell": "sh",
    "bash": "sh",
    "sh": "sh",
    "sql": "sql",
    "yaml": "yaml",
    "yml": "yaml",
    "xml": "xml",
    "text": "txt",
    "txt": "txt",
}


def _detect_python() -> str:
    """Return a working Python interpreter path.

    Prefers sys.executable (the interpreter running this agent), which is the
    most reliable choice. Falls back to a known Windows location.
    """
    exe = sys.executable
    if exe and Path(exe).exists():
        return exe
    candidates = [
        r"C:\Users\MSI\AppData\Local\Programs\Python\Python311\python.exe",
        r"C:\Python311\python.exe",
        "python",
        "python3",
    ]
    for c in candidates:
        if shutil.which(c):
            return c
    raise ToolError("No usable Python interpreter found on this system.")


@register("createPythonFile")
def create_python_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    content = args.get("content", "")
    if not path:
        raise ToolError("Parameter 'path' is required.")
    p = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    if p.suffix.lower() != ".py":
        p = p.with_suffix(".py")
    _ensure_safe(p)
    if p.exists() and not args.get("overwrite"):
        raise ToolError(f"File already exists: {p}. Pass overwrite=true to replace.")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(str(content) + ("" if str(content).endswith("\n") else "\n"), encoding="utf-8")
    return {"result": f"Created Python file: {p}", "path": str(p)}


@register("writeCodeFile")
def write_code_file(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    content = args.get("content", "")
    language = (args.get("language") or "txt").strip().lower()
    if not path:
        raise ToolError("Parameter 'path' is required.")
    p = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    # If the caller gave a basename without extension, append the language's.
    ext = LANG_EXT.get(language)
    if ext and p.suffix == "":
        p = p.with_suffix("." + ext)
    _ensure_safe(p)
    if p.exists() and not args.get("overwrite"):
        raise ToolError(f"File already exists: {p}. Pass overwrite=true to replace.")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(str(content), encoding="utf-8")
    return {"result": f"Wrote {language} file: {p}", "path": str(p)}


@register("createProjectFolder")
def create_project_folder(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path") or args.get("name")
    if not path:
        raise ToolError("Parameter 'path' (project root) is required.")
    root = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    _ensure_safe(root)
    root.mkdir(parents=True, exist_ok=True)

    subfolders: List[str] = args.get("subfolders") or args.get("structure") or []
    created = [str(root)]
    default_scaffold = {
        "src": None,
        "tests": None,
        "docs": None,
    }
    if args.get("scaffold_standard", False):
        for sub in default_scaffold:
            (root / sub).mkdir(exist_ok=True)
            created.append(str(root / sub))
    if subfolders:
        for sub in subfolders:
            sp = (root / str(sub)).resolve()
            _ensure_safe(sp)
            sp.mkdir(parents=True, exist_ok=True)
            created.append(str(sp))

    # Optional starter files.
    files: Dict[str, str] = args.get("files") or {}
    for rel, content in files.items():
        fp = (root / str(rel)).resolve()
        _ensure_safe(fp)
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_text(str(content), encoding="utf-8")
        created.append(str(fp))

    return {"result": f"Project folder created at {root}.", "path": str(root), "created": created}


@register("runPythonScript")
def run_python_script(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path")
    if not path:
        raise ToolError("Parameter 'path' (script path) is required.")
    p = Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()
    _ensure_safe(p)
    if not p.exists():
        raise ToolError(f"Script does not exist: {p}")
    if p.suffix.lower() != ".py":
        p = p.with_suffix(".py")
        if not p.exists():
            raise ToolError(f"Script does not exist: {p}")

    interpreter = _detect_python()
    script_args: List[str] = args.get("args") or []
    if isinstance(script_args, str):
        script_args = [script_args]
    timeout = int(args.get("timeout", 30))

    cmd = [interpreter, str(p)] + [str(a) for a in script_args]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(p.parent),
        )
    except subprocess.TimeoutExpired:
        return {
            "result": f"Script timed out after {timeout}s.",
            "stdout": "",
            "stderr": f"Execution exceeded {timeout}s and was terminated.",
            "exit_code": None,
            "timed_out": True,
        }
    out = (proc.stdout or "")
    err = (proc.stderr or "")
    # Trim large outputs.
    if len(out) > 8000:
        out = out[:8000] + "…[truncated]"
    if len(err) > 4000:
        err = err[:4000] + "…[truncated]"
    status = "completed successfully" if proc.returncode == 0 else f"exited with code {proc.returncode}"
    return {
        "result": f"Ran {p.name}: {status}.",
        "stdout": out,
        "stderr": err,
        "exit_code": proc.returncode,
    }


@register("scaffoldAIModelProject")
def scaffold_ai_model_project(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Scaffold a complete, runnable custom AI/ML model project with dataset preparation,
    training pipeline, model persistence (pickle/joblib), and inference script.

    args:
        project_name: Name of the model project (e.g. 'sentiment_analyzer', 'house_pricing')
        model_type: 'text_classification' | 'tabular_classification' | 'tabular_regression' | 'neural_network'
        target_description: Short description of what the model should predict.
        base_dir: Optional root directory (defaults to current working directory)
    """
    project_name = (args.get("project_name") or "my_custom_ai_model").strip().replace(" ", "_")
    model_type = (args.get("model_type") or "text_classification").lower().strip()
    target_desc = args.get("target_description") or "Custom prediction model"
    base_dir_raw = args.get("base_dir") or "."

    base_dir = _ensure_safe(base_dir_raw)
    proj_dir = base_dir / "ai_models" / project_name
    proj_dir.mkdir(parents=True, exist_ok=True)

    # 1. README
    readme_content = f"""# {project_name.replace('_', ' ').title()}
Model Type: `{model_type}`
Description: {target_desc}

## Project Structure
- `dataset.py`: Prepares sample training data (or load your own CSV).
- `train.py`: Trains the AI model, prints accuracy/loss, and saves `model.pkl`.
- `predict.py`: Loads the trained model and performs inference on new inputs.
- `requirements.txt`: Python dependencies.

## How to Train & Run:
1. Train: Run `python train.py` (or ask Myraa: "train this model").
2. Predict: Run `python predict.py "your input here"` (or ask Myraa: "test my input").
"""

    # 2. Requirements
    reqs_content = "scikit-learn>=1.4.0\nnumpy>=1.26.0\njoblib>=1.3.0\n"

    # 3. Model templates based on type
    if "tabular_reg" in model_type:
        dataset_code = '''"""Data preparation module for tabular regression."""
import numpy as np

def get_training_data():
    np.random.seed(42)
    # 5 features: e.g. size, bedrooms, age, location_score, distance
    X = np.random.uniform(10, 100, size=(200, 5))
    # Target value: e.g. price in thousands
    y = X[:, 0] * 3.5 + X[:, 1] * 12.0 - X[:, 2] * 0.8 + X[:, 3] * 5.0 + np.random.normal(0, 5, size=200)
    feature_names = ["feature_size", "feature_rooms", "feature_age", "feature_score", "feature_dist"]
    return X, y, feature_names
'''
        train_code = '''"""Model training pipeline for Tabular Regression."""
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from dataset import get_training_data

def train():
    print("Loading dataset...")
    X, y, feature_names = get_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training RandomForestRegressor on {len(X_train)} samples...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    r2 = r2_score(y_test, preds)

    print(f"\\n--- Training Complete ---")
    print(f"Mean Squared Error: {mse:.4f}")
    print(f"R2 Score: {r2:.4f}")

    bundle = {"model": model, "feature_names": feature_names, "type": "regression"}
    joblib.dump(bundle, "model.pkl")
    print("Trained model saved successfully as 'model.pkl'!")

if __name__ == "__main__":
    train()
'''
        predict_code = '''"""Inference script for Tabular Regression."""
import sys
import joblib
import numpy as np

def predict(input_features=None):
    try:
        bundle = joblib.load("model.pkl")
    except Exception as e:
        print(f"Error loading model: {e}. Please run train.py first!")
        return

    model = bundle["model"]
    if input_features is None:
        input_features = [55.0, 3.0, 5.0, 80.0, 12.0]

    arr = np.array(input_features, dtype=float).reshape(1, -1)
    prediction = model.predict(arr)[0]
    print(f"Input features: {input_features}")
    print(f"Predicted Output: {prediction:.2f}")
    return prediction

if __name__ == "__main__":
    predict()
'''
    elif "tabular_class" in model_type or "tabular" in model_type:
        dataset_code = '''"""Data preparation module for tabular classification."""
import numpy as np

def get_training_data():
    np.random.seed(42)
    X = np.random.normal(0, 1, size=(250, 4))
    # Binary target
    y = ((X[:, 0] * 1.5 + X[:, 1] * -2.0 + np.random.normal(0, 0.5, size=250)) > 0).astype(int)
    feature_names = ["metric_a", "metric_b", "metric_c", "metric_d"]
    return X, y, feature_names
'''
        train_code = '''"""Model training pipeline for Tabular Classification."""
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from dataset import get_training_data

def train():
    print("Loading dataset...")
    X, y, feature_names = get_training_data()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training GradientBoostingClassifier on {len(X_train)} samples...")
    model = GradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\\n--- Training Complete ---")
    print(f"Validation Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, preds))

    bundle = {"model": model, "feature_names": feature_names, "type": "classification"}
    joblib.dump(bundle, "model.pkl")
    print("Trained model saved as 'model.pkl'!")

if __name__ == "__main__":
    train()
'''
        predict_code = '''"""Inference script for Tabular Classification."""
import sys
import joblib
import numpy as np

def predict(input_features=None):
    try:
        bundle = joblib.load("model.pkl")
    except Exception as e:
        print(f"Error loading model: {e}. Please run train.py first!")
        return

    model = bundle["model"]
    if input_features is None:
        input_features = [0.85, -1.2, 0.1, 0.4]

    arr = np.array(input_features, dtype=float).reshape(1, -1)
    prediction = model.predict(arr)[0]
    prob = model.predict_proba(arr)[0][prediction]
    print(f"Input features: {input_features}")
    print(f"Predicted Class: {prediction} (Confidence: {prob*100:.1f}%)")
    return prediction

if __name__ == "__main__":
    predict()
'''
    else:
        # Default: Text Classification / Sentiment / Intent NLP
        dataset_code = '''"""Data preparation module for Text Classification."""

def get_training_data():
    samples = [
        ("I love this product, it works brilliantly!", "positive"),
        ("Amazing experience, high quality and super fast.", "positive"),
        ("Best purchase I made this year, highly recommended.", "positive"),
        ("Terrific customer service and great build.", "positive"),
        ("Completely satisfied, five stars!", "positive"),
        ("Super helpful and works exactly as expected.", "positive"),
        ("This is terrible, completely broken on day one.", "negative"),
        ("Horrible experience, never buying from here again.", "negative"),
        ("Waste of money, poor quality and slow.", "negative"),
        ("Did not work at all, very disappointed.", "negative"),
        ("Customer support was rude and unhelpful.", "negative"),
        ("Stopped working after 10 minutes, absolute junk.", "negative"),
        ("It was okay, not great but not terrible.", "neutral"),
        ("Average product, does the bare minimum.", "neutral"),
        ("Arrived on time, packaging was normal.", "neutral"),
    ]
    texts = [s[0] for s in samples]
    labels = [s[1] for s in samples]
    return texts, labels
'''
        train_code = '''"""Model training pipeline for Text Classification."""
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from dataset import get_training_data

def train():
    print("Loading text dataset...")
    texts, labels = get_training_data()
    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.25, random_state=42)

    print(f"Building TF-IDF + LogisticRegression pipeline with {len(X_train)} samples...")
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("clf", LogisticRegression(random_state=42))
    ])

    pipeline.fit(X_train, y_train)
    preds = pipeline.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\\n--- Training Complete ---")
    print(f"Validation Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, preds, zero_division=0))

    joblib.dump(pipeline, "model.pkl")
    print("Trained model saved as 'model.pkl'!")

if __name__ == "__main__":
    train()
'''
        predict_code = '''"""Inference script for Text Classification."""
import sys
import joblib

def predict(text=None):
    try:
        pipeline = joblib.load("model.pkl")
    except Exception as e:
        print(f"Error loading model: {e}. Please run train.py first!")
        return

    if not text:
        text = "This assistant is really fast and helpful!" if len(sys.argv) < 2 else sys.argv[1]

    pred = pipeline.predict([text])[0]
    probs = pipeline.predict_proba([text])[0]
    classes = pipeline.classes_
    prob_dict = {cls: round(float(p), 4) for cls, p in zip(classes, probs)}

    print(f"Input: \\"{text}\\"")
    print(f"Predicted Category: {pred}")
    print(f"Probabilities: {prob_dict}")
    return pred

if __name__ == "__main__":
    inp = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else None
    predict(inp)
'''

    # Write files
    (proj_dir / "README.md").write_text(readme_content, encoding="utf-8")
    (proj_dir / "requirements.txt").write_text(reqs_content, encoding="utf-8")
    (proj_dir / "dataset.py").write_text(dataset_code, encoding="utf-8")
    (proj_dir / "train.py").write_text(train_code, encoding="utf-8")
    (proj_dir / "predict.py").write_text(predict_code, encoding="utf-8")

    return {
        "result": f"Successfully scaffolded AI model project '{project_name}'!",
        "project_dir": str(proj_dir),
        "model_type": model_type,
        "files_created": ["README.md", "requirements.txt", "dataset.py", "train.py", "predict.py"],
        "instructions": (
            f"AI model project is ready in '{proj_dir}'.\\n"
            f"1. To train immediately: runPythonScript(path='{proj_dir / 'train.py'}')\\n"
            f"2. To predict: runPythonScript(path='{proj_dir / 'predict.py'}', args=['your input test text'])\\n"
            f"3. You can chat with Myraa to add real data or tweak model parameters."
        )
    }


__all__ = [
    "create_python_file",
    "write_code_file",
    "create_project_folder",
    "run_python_script",
    "scaffold_ai_model_project",
]
