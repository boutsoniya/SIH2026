"""Model adapter with a deliberately safe default.

The interface is ready for a kit-specific, laboratory-labelled model. Until such
an artefact is supplied and evaluated, inference returns INCONCLUSIVE rather than
inventing a field classification.
"""

RESULTS = ("PRESUMPTIVE_POSITIVE", "PRESUMPTIVE_NEGATIVE", "INCONCLUSIVE")


def predict(features: dict, model=None) -> dict:
    if model is None:
        return {
            "result": "INCONCLUSIVE",
            "confidence": None,
            "class_probabilities": None,
            "model_status": "not_configured",
        }

    vector = [features[key] for key in sorted(features)]
    probabilities = model.predict_proba([vector])[0]
    index = int(probabilities.argmax())
    classes = list(model.classes_)
    return {
        "result": classes[index],
        "confidence": round(float(probabilities[index]), 4),
        "class_probabilities": {
            str(label): round(float(prob), 4)
            for label, prob in zip(classes, probabilities)
        },
        "model_status": "loaded",
    }
