export default function PageHeader({
  eyebrow,
  title,
  description,
  result,
}) {
  return (
    <div className="page-header">

      <div>

        <p className="analysis-label">
          {eyebrow}
        </p>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

      </div>

      {result?.filename && (
        <div className="workspace-chip">

          <span className="workspace-chip-dot" />

          <span>
            {result.filename}
          </span>

        </div>
      )}

    </div>
  );
}