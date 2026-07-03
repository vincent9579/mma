"""Export PaddleOCR recognition model to ONNX + download character dictionary.
Run once: python export_models.py --output-dir ./models
"""
import argparse, os, sys, urllib.request
from pathlib import Path

os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

def export(output_dir: str):
    import paddle
    from paddleocr import PaddleOCR
    import numpy as np

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    onnx_path = out / "rec_model.onnx"
    dict_path = out / "ppocr_keys_v1.txt"

    if onnx_path.exists():
        print(f"  {onnx_path.name} already exists, skipping")
    else:
        print("Loading PaddleOCR recognition model...")
        ocr = PaddleOCR(
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="PP-OCRv5_mobile_rec",
        )

        # Find the downloaded rec model dir. Layout differs by paddleocr version:
        # legacy caches use *_rec_infer/ with inference.pdmodel; paddleocr 3.x uses
        # official_models/PP-OCRv5_mobile_rec/ with PIR inference.json.
        candidates = []
        for root in (Path.home() / ".paddlex", Path.home() / ".paddleocr"):
            if root.exists():
                candidates += [p.parent for p in root.rglob("inference.pdiparams")]
        rec_dirs = [d for d in candidates if "rec" in d.name.lower()]
        print(f"Found rec model dirs: {rec_dirs}")

        import subprocess
        for d in rec_dirs:
            model_name = next((n for n in ("inference.pdmodel", "inference.json") if (d / n).exists()), None)
            if model_name is None:
                continue
            print(f"Converting {d} to ONNX...")
            # CLI is the only paddle2onnx interface stable across versions
            r = subprocess.run([
                "paddle2onnx", "--model_dir", str(d),
                "--model_filename", model_name,
                "--params_filename", "inference.pdiparams",
                "--save_file", str(onnx_path),
                "--opset_version", "14",
            ])
            if r.returncode != 0:
                print(f"ERROR: paddle2onnx failed ({r.returncode})")
                sys.exit(1)
            print(f"  -> {onnx_path} ({onnx_path.stat().st_size / 1024:.0f} KB)")
            break
        else:
            print("ERROR: Could not find PaddleOCR inference model files")
            sys.exit(1)
        if not onnx_path.exists() or onnx_path.stat().st_size < 1_000_000:
            print("ERROR: ONNX export produced no/undersized model")
            sys.exit(1)

    # Download/find character dictionary
    if dict_path.exists():
        print(f"  {dict_path.name} already exists, skipping")
    else:
        print("Downloading character dictionary...")
        url = "https://raw.githubusercontent.com/PaddlePaddle/PaddleOCR/main/ppocr/utils/en_dict.txt"
        try:
            urllib.request.urlretrieve(url, str(dict_path))
            print(f"  -> {dict_path}")
        except Exception as e:
            print(f"Failed to download dict: {e}")
            # Create a basic ASCII dict as fallback
            with open(dict_path, "w") as f:
                for c in "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ©().,/-":
                    f.write(c + "\n")
            print(f"  -> Created fallback dict at {dict_path}")

    print(f"\nDone. Models in {out}/")
    for f in sorted(out.iterdir()):
        print(f"  {f.name}: {f.stat().st_size / 1024:.0f} KB")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="./models")
    args = parser.parse_args()
    export(args.output_dir)
