/*
 * CONTINUITY & CANON CHECKER
 * App.jsx
 *
 * Added:
 * 1. Canon Explorer -> Chapter Explorer navigation
 * 2. Chapter Explorer -> Related Conflicts
 * 3. Conflict Explorer -> Related Canon -> Chapter
 * 4. Selected chapter highlighting
 * 5. Conflict Intelligence
 * 6. Confidence score and explanation
 * 7. Conflicting date groups
 * 8. Evidence / Canon match statistics
 */

import { useMemo, useState } from "react";
import "./App.css";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import PageHeader from "./components/layout/PageHeader";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // ==================================================
  // STATE
  // ==================================================

  const [file, setFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [buildingCanon, setBuildingCanon] = useState(false);
  const [loadingCanon, setLoadingCanon] = useState(false);
  const [checkingContinuity, setCheckingContinuity] =
    useState(false);
  const [loadingHistory, setLoadingHistory] =
    useState(false);
  const [loadingDashboard, setLoadingDashboard] =
    useState(false);

  const [result, setResult] = useState(null);
  const [canonResult, setCanonResult] = useState(null);
  const [canonData, setCanonData] = useState(null);
  const [continuityResult, setContinuityResult] =
    useState(null);
  const [dashboard, setDashboard] = useState(null);

  const [reviewHistory, setReviewHistory] = useState([]);
  const [reviewFilter, setReviewFilter] =
    useState("all");
  const [selectedReview, setSelectedReview] =
    useState(null);

  const [selectedConflict, setSelectedConflict] =
    useState(null);

  const [selectedEvidenceIndex, setSelectedEvidenceIndex] =
    useState(0);

  const [chapterList, setChapterList] = useState([]);
  const [selectedChapter, setSelectedChapter] =
    useState(null);

  const [loadingChapters, setLoadingChapters] =
    useState(false);
  const [loadingChapter, setLoadingChapter] =
    useState(false);

  const [chapterExplorerOpen, setChapterExplorerOpen] =
    useState(false);

  const [chapterExplorerError, setChapterExplorerError] =
    useState("");

  const [savingReviewId, setSavingReviewId] =
    useState(null);

  const [canonSection, setCanonSection] =
    useState("characters");

  const [error, setError] = useState("");

  // ==================================================
  // APPLICATION NAVIGATION
  // ==================================================

  const [activePage, setActivePage] = useState("dashboard");

  const navigationItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "⌂",
    },
    {
      key: "manuscripts",
      label: "Manuscripts",
      icon: "▤",
    },
    {
      key: "canon",
      label: "Canon Explorer",
      icon: "◈",
    },
    {
      key: "continuity",
      label: "Continuity",
      icon: "◌",
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: "✓",
    },
  ];

  const navigateToPage = (page) => {
    setActivePage(page);

    if (
      page === "dashboard" &&
      result?.filename
    ) {
      loadDashboard(result.filename);
    }

    if (
      page === "reviews" &&
      result?.filename
    ) {
      loadReviewHistory(result.filename);
    }

    if (
      page === "canon" &&
      result?.filename
    ) {
      loadCanon(result.filename);
    }
  };

  // ==================================================
  // FILE SELECTION
  // ==================================================

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files[0];

    setError("");
    setResult(null);
    setCanonResult(null);
    setCanonData(null);
    setContinuityResult(null);
    setDashboard(null);
    setReviewHistory([]);
    setReviewFilter("all");
    setSelectedReview(null);
    setSelectedConflict(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !==
        "application/pdf" &&
      !selectedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setError(
        "Please select a PDF file."
      );

      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  // ==================================================
  // LOAD CHAPTER LIST
  // ==================================================

  const loadChapters = async (
    manuscriptName
  ) => {
    if (!manuscriptName) {
      return;
    }

    setLoadingChapters(true);
    setChapterExplorerError("");

    try {
      const response = await fetch(
        `${API_URL}/chapters/${encodeURIComponent(
          manuscriptName
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not load chapters."
        );
      }

      setChapterList(
        Array.isArray(data.chapters)
          ? data.chapters
          : []
      );
    } catch (err) {
      setChapterExplorerError(
        err.message ||
          "Could not load chapter list."
      );
    } finally {
      setLoadingChapters(false);
    }
  };

  // ==================================================
  // OPEN CHAPTER EXPLORER
  // ==================================================

  const openChapterExplorer = async (
    chapterNumber
  ) => {
    if (
      !result?.filename ||
      chapterNumber ===
        undefined ||
      chapterNumber === null
    ) {
      return;
    }

    setChapterExplorerOpen(true);
    setLoadingChapter(true);
    setChapterExplorerError("");

    try {
      const response = await fetch(
        `${API_URL}/chapters/${encodeURIComponent(
          result.filename
        )}/${chapterNumber}`
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            `Could not load Chapter ${chapterNumber}.`
        );
      }

      setSelectedChapter(
        data.chapter || null
      );

      if (!chapterList.length) {
        await loadChapters(
          result.filename
        );
      }
    } catch (err) {
      setSelectedChapter(null);

      setChapterExplorerError(
        err.message ||
          "Could not load chapter."
      );
    } finally {
      setLoadingChapter(false);
    }
  };

  // ==================================================
  // CLOSE CHAPTER EXPLORER
  // ==================================================

  const closeChapterExplorer = () => {
    setChapterExplorerOpen(false);
    setSelectedChapter(null);
    setChapterExplorerError("");
  };

  // ==================================================
  // NAVIGATE CHAPTERS
  // ==================================================

  const navigateChapter = async (
    direction
  ) => {
    if (
      !selectedChapter?.chapter_number
    ) {
      return;
    }

    const currentNumber =
      Number(
        selectedChapter.chapter_number
      );

    const currentIndex =
      chapterList.findIndex(
        (chapter) =>
          Number(
            chapter.chapter_number
          ) === currentNumber
      );

    let nextIndex =
      currentIndex + direction;

    if (currentIndex === -1) {
      nextIndex =
        direction > 0
          ? 0
          : chapterList.length - 1;
    }

    if (
      nextIndex < 0 ||
      nextIndex >= chapterList.length
    ) {
      return;
    }

    await openChapterExplorer(
      chapterList[nextIndex]
        .chapter_number
    );
  };

  // ==================================================
  // UPLOAD MANUSCRIPT
  // ==================================================

  const handleUpload = async () => {
    if (!file) {
      setError(
        "Please select a PDF manuscript first."
      );

      return;
    }

    setUploading(true);
    setError("");
    setResult(null);
    setCanonResult(null);
    setCanonData(null);
    setContinuityResult(null);
    setDashboard(null);
    setReviewHistory([]);
    setSelectedReview(null);
    setSelectedConflict(null);
    setChapterList([]);
    setSelectedChapter(null);
    setChapterExplorerOpen(false);
    setChapterExplorerError("");

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    try {
      const response = await fetch(
        `${API_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Upload failed."
        );
      }

      setResult(data);

      await loadChapters(
        data.filename
      );

      await loadReviewHistory(
        data.filename
      );
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Make sure FastAPI is running on http://127.0.0.1:8000."
      );
    } finally {
      setUploading(false);
    }
  };

  // ==================================================
  // BUILD CANON
  // ==================================================

  const handleBuildCanon =
    async () => {
      if (!result?.filename) {
        setError(
          "Please upload and analyze a manuscript first."
        );

        return;
      }

      setBuildingCanon(true);
      setError("");
      setCanonResult(null);
      setCanonData(null);
      setContinuityResult(null);
      setDashboard(null);
      setSelectedReview(null);
      setSelectedConflict(null);

      try {
        const response =
          await fetch(
            `${API_URL}/build-canon/${encodeURIComponent(
              result.filename
            )}`,
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Canon building failed."
          );
        }

        setCanonResult(data);

        await loadCanon(
          result.filename
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not build the canon."
        );
      } finally {
        setBuildingCanon(false);
      }
    };

  // ==================================================
  // LOAD CANON
  // ==================================================

  const loadCanon =
    async (
      manuscriptName
    ) => {
      if (!manuscriptName) {
        return;
      }

      setLoadingCanon(true);

      try {
        const response =
          await fetch(
            `${API_URL}/canon/${encodeURIComponent(
              manuscriptName
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not load the canon."
          );
        }

        setCanonData(
          data.canon || null
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not load the manuscript canon."
        );
      } finally {
        setLoadingCanon(false);
      }
    };

  // ==================================================
  // LOAD REVIEW HISTORY
  // ==================================================

  const loadReviewHistory =
    async (
      manuscriptName
    ) => {
      if (!manuscriptName) {
        return;
      }

      setLoadingHistory(true);

      try {
        const response =
          await fetch(
            `${API_URL}/reviews/${encodeURIComponent(
              manuscriptName
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not load review history."
          );
        }

        setReviewHistory(
          Array.isArray(
            data.reviews
          )
            ? data.reviews
            : []
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not load review history."
        );
      } finally {
        setLoadingHistory(false);
      }
    };

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  const loadDashboard =
    async (
      manuscriptName
    ) => {
      if (!manuscriptName) {
        return;
      }

      setLoadingDashboard(true);

      try {
        const response =
          await fetch(
            `${API_URL}/dashboard/${encodeURIComponent(
              manuscriptName
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not load dashboard."
          );
        }

        setDashboard(data);
      } catch (err) {
        setError(
          err.message ||
            "Could not load dashboard analytics."
        );
      } finally {
        setLoadingDashboard(false);
      }
    };

  // ==================================================
  // RUN CONTINUITY CHECK
  // ==================================================

  const handleContinuityCheck =
    async () => {
      if (!result?.filename) {
        setError(
          "Please upload and analyze a manuscript first."
        );

        return;
      }

      setCheckingContinuity(true);
      setError("");
      setSelectedReview(null);
      setSelectedConflict(null);
      setDashboard(null);

      try {
        const response =
          await fetch(
            `${API_URL}/check-continuity/${encodeURIComponent(
              result.filename
            )}`,
            {
              method: "POST",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Continuity check failed."
          );
        }

        setContinuityResult(data);

        await loadReviewHistory(
          result.filename
        );

        await loadDashboard(
          result.filename
        );

        await loadCanon(
          result.filename
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not run the continuity check."
        );
      } finally {
        setCheckingContinuity(false);
      }
    };

  // ==================================================
  // SAVE REVIEW DECISION
  // ==================================================

  const handleReviewDecision =
    async (
      conflict,
      status
    ) => {
      if (!result?.filename) {
        return;
      }

      const conflictId =
        conflict.conflict_id ||
        `${conflict.type}-${conflict.message}`;

      setSavingReviewId(
        conflictId
      );

      setError("");

      try {
        const response =
          await fetch(
            `${API_URL}/reviews/${encodeURIComponent(
              result.filename
            )}?status=${encodeURIComponent(
              status
            )}`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                conflict
              ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Could not save review decision."
          );
        }

        const savedReview =
          data.review || data;

        setContinuityResult(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              conflicts:
                (
                  previous.conflicts ||
                  []
                ).map(
                  (item) => {
                    const itemId =
                      item.conflict_id ||
                      `${item.type}-${item.message}`;

                    if (
                      itemId ===
                      conflictId
                    ) {
                      return {
                        ...item,

                        conflict_id:
                          item.conflict_id ||
                          conflictId,

                        review_status:
                          status,

                        reviewed:
                          true,
                      };
                    }

                    return item;
                  }
                ),
            };
          }
        );

        setSelectedConflict(
          (previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,

              review_status:
                status,

              reviewed:
                true,
            };
          }
        );

        if (
          savedReview &&
          savedReview.conflict_id
        ) {
          setReviewHistory(
            (previous) => {
              const exists =
                previous.some(
                  (item) =>
                    item.conflict_id ===
                    savedReview.conflict_id
                );

              if (exists) {
                return previous.map(
                  (item) =>
                    item.conflict_id ===
                    savedReview.conflict_id
                      ? savedReview
                      : item
                );
              }

              return [
                ...previous,
                savedReview,
              ];
            }
          );

          setSelectedReview(
            savedReview
          );
        } else {
          await loadReviewHistory(
            result.filename
          );
        }

        await loadDashboard(
          result.filename
        );
      } catch (err) {
        setError(
          err.message ||
            "Could not save the review decision."
        );
      } finally {
        setSavingReviewId(
          null
        );
      }
    };

  // ==================================================
  // HELPERS
  // ==================================================

  const formatConflictType =
    (type) => {
      if (!type) {
        return "Continuity Conflict";
      }

      return type
        .replaceAll(
          "_",
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };

  const formatStatus =
    (status) => {
      if (!status) {
        return "Needs Review";
      }

      return status
        .replaceAll(
          "_",
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };

  const formatDate =
    (
      month,
      year
    ) => {
      if (
        !month ||
        !year
      ) {
        return null;
      }

      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      return `${
        months[
          month - 1
        ] || month
      } ${year}`;
    };

  const getConflictReviewStatus =
    (conflict) => {
      return (
        conflict.review_status ||
        "needs_review"
      );
    };

  // ==================================================
  // CONFLICT INTELLIGENCE HELPERS
  // ==================================================

  const getConflictIntelligence =
    (conflict) => {
      return (
        conflict?.conflict_intelligence ||
        null
      );
    };

  const getConflictConfidence =
    (conflict) => {
      const intelligence =
        getConflictIntelligence(
          conflict
        );

      if (
        intelligence?.confidence
      ) {
        return intelligence.confidence;
      }

      if (
        conflict?.confidence
      ) {
        return conflict.confidence;
      }

      return null;
    };

  const getConflictExplanation =
    (conflict) => {
      const intelligence =
        getConflictIntelligence(
          conflict
        );

      if (
        intelligence?.explanation
      ) {
        return intelligence.explanation;
      }

      if (
        conflict?.explanation
      ) {
        return conflict.explanation;
      }

      return null;
    };

  const getDateGroups =
    (conflict) => {
      const explanation =
        getConflictExplanation(
          conflict
        );

      if (
        Array.isArray(
          explanation?.date_groups
        )
      ) {
        return explanation.date_groups;
      }

      return [];
    };

  const renderConflictIntelligence =
    (conflict) => {
      const intelligence =
        getConflictIntelligence(
          conflict
        );

      const confidence =
        getConflictConfidence(
          conflict
        );

      const explanation =
        getConflictExplanation(
          conflict
        );

      const dateGroups =
        getDateGroups(
          conflict
        );

      const evidenceCount =
        intelligence?.evidence_count ??
        conflict?.evidence?.length ??
        0;

      const canonMatchCount =
        intelligence?.canon_match_count ??
        conflict?.related_canon?.match_count ??
        conflict?.related_canon?.matches?.length ??
        0;

      if (
        !intelligence &&
        !confidence &&
        !explanation
      ) {
        return null;
      }

      return (
        <section className="conflict-intelligence">

          <div className="conflict-intelligence-header">

            <div>

              <p className="analysis-label">
                CONFLICT INTELLIGENCE
              </p>

              <h5>
                Why this conflict matters
              </h5>

              <p>
                Evidence and analysis
                generated from the
                manuscript continuity
                check.
              </p>

            </div>

            {confidence && (
              <div
                className={`conflict-confidence conflict-confidence-${String(
                  confidence.level ||
                    "unknown"
                ).toLowerCase()}`}
              >

                <span>
                  {confidence.label ||
                    `${confidence.level || "Unknown"} Confidence`}
                </span>

                {confidence.score !==
                  undefined &&
                  confidence.score !==
                    null && (
                  <strong>
                    {confidence.score}%
                  </strong>
                )}

              </div>
            )}

          </div>

          <div className="conflict-intelligence-stats">

            <div className="conflict-intelligence-stat">

              <span>
                Evidence
              </span>

              <strong>
                {evidenceCount}
              </strong>

            </div>

            <div className="conflict-intelligence-stat">

              <span>
                Canon Matches
              </span>

              <strong>
                {canonMatchCount}
              </strong>

            </div>

            {confidence?.level && (
              <div className="conflict-intelligence-stat">

                <span>
                  Confidence
                </span>

                <strong>
                  {confidence.level}
                </strong>

              </div>
            )}

          </div>

          {explanation?.text && (
            <div className="conflict-intelligence-explanation">

              <span>
                Explanation
              </span>

              <p>
                {explanation.text}
              </p>

            </div>
          )}

          {dateGroups.length > 0 && (
            <div className="conflict-date-groups">

              <div className="conflict-intelligence-subheading">

                <div>

                  <p className="analysis-label">
                    CONFLICTING DATES
                  </p>

                  <h6>
                    Timeline comparison
                  </h6>

                </div>

                <span>
                  {dateGroups.length}{" "}
                  groups
                </span>

              </div>

              <div className="conflict-date-group-grid">

                {dateGroups.map(
                  (
                    group,
                    index
                  ) => {

                    const formattedDate =
                      formatDate(
                        group.month,
                        group.year
                      );

                    const chapters =
                      Array.isArray(
                        group.chapters
                      )
                        ? group.chapters
                        : [];

                    return (
                      <div
                        className="conflict-date-group"
                        key={`${group.year}-${group.month}-${index}`}
                      >

                        <div className="conflict-date-group-header">

                          <span>
                            Date Group{" "}
                            {index + 1}
                          </span>

                          <strong>
                            {formattedDate ||
                              "Unknown Date"}
                          </strong>

                        </div>

                        <div className="conflict-date-chapters">

                          {chapters.length >
                          0 ? (
                            chapters.map(
                              (
                                chapter
                              ) => (
                                <button
                                  type="button"
                                  key={
                                    chapter
                                  }
                                  className="conflict-date-chapter"
                                  onClick={() =>
                                    openChapterExplorer(
                                      chapter
                                    )
                                  }
                                >
                                  <span>
                                    Chapter
                                  </span>

                                  <strong>
                                    {
                                      chapter
                                    }
                                  </strong>

                                  <span>
                                    Open →
                                  </span>
                                </button>
                              )
                            )
                          ) : (
                            <span>
                              No chapters
                              supplied
                            </span>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>
          )}

          {Array.isArray(
            intelligence?.confidence?.score
          ) && null}

        </section>
      );
    };

  // ==================================================
  // EXTRACT CHAPTER NUMBER FROM CANON FACT
  // ==================================================

  const getCanonChapter =
    (item) => {
      if (!item) {
        return null;
      }

      if (
        typeof item ===
        "object"
      ) {
        if (
          item.chapter !==
          undefined &&
          item.chapter !==
          null
        ) {
          return Number(
            item.chapter
          );
        }

        if (
          item.chapter_number !==
          undefined &&
          item.chapter_number !==
          null
        ) {
          return Number(
            item.chapter_number
          );
        }

        if (
          item.source_chapter !==
          undefined &&
          item.source_chapter !==
          null
        ) {
          return Number(
            item.source_chapter
          );
        }

        if (
          item.fact &&
          typeof item.fact ===
            "object"
        ) {
          return getCanonChapter(
            item.fact
          );
        }
      }

      return null;
    };

  // ==================================================
  // GET CANON DISPLAY NAME
  // ==================================================

  const getDisplayName =
    (
      item,
      fallback
    ) => {
      if (
        item &&
        typeof item ===
          "object"
      ) {
        return (
          item.name ||
          item.title ||
          item.description ||
          item.fact ||
          fallback
        );
      }

      return String(
        item ??
          fallback
      );
    };

  // ==================================================
  // CANON OBJECT RENDERER
  // ==================================================

  const renderCanonObject =
    (
      value,
      depth = 0
    ) => {
      if (
        value ===
          null ||
        value ===
          undefined
      ) {
        return null;
      }

      if (
        typeof value !==
        "object"
      ) {
        return (
          <span>
            {String(value)}
          </span>
        );
      }

      if (
        Array.isArray(
          value
        )
      ) {
        return (
          <div className="canon-detail-list">

            {value.map(
              (
                item,
                index
              ) => (
                <div
                  className="canon-detail-item"
                  key={index}
                >
                  {renderCanonObject(
                    item,
                    depth + 1
                  )}
                </div>
              )
            )}

          </div>
        );
      }

      return (
        <div className="canon-object">

          {Object.entries(
            value
          ).map(
            (
              [key, item]
            ) => (
              <div
                className="canon-object-row"
                key={key}
              >

                <span>
                  {formatConflictType(
                    key
                  )}
                </span>

                <div>
                  {renderCanonObject(
                    item,
                    depth + 1
                  )}
                </div>

              </div>
            )
          )}

        </div>
      );
    };

  // ==================================================
  // CANON DATA
  // ==================================================

  const getCanonValue =
    (section) => {
      if (!canonData) {
        return [];
      }

      const value =
        canonData[
          section
        ];

      if (
        value ===
          null ||
        value ===
          undefined
      ) {
        return [];
      }

      return value;
    };

  // ==================================================
  // REVIEW SUMMARY
  // ==================================================

  const reviewSummary =
    useMemo(() => {
      const conflicts =
        continuityResult?.conflicts ||
        [];

      return {
        total:
          conflicts.length,

        confirmed:
          conflicts.filter(
            (conflict) =>
              getConflictReviewStatus(
                conflict
              ) ===
              "confirmed"
          ).length,

        dismissed:
          conflicts.filter(
            (conflict) =>
              getConflictReviewStatus(
                conflict
              ) ===
              "dismissed"
          ).length,

        needsReview:
          conflicts.filter(
            (conflict) =>
              getConflictReviewStatus(
                conflict
              ) ===
              "needs_review"
          ).length,
      };
    }, [
      continuityResult,
    ]);

  // ==================================================
  // REVIEW HISTORY FILTER
  // ==================================================

  const filteredReviewHistory =
    useMemo(() => {
      if (
        reviewFilter ===
        "all"
      ) {
        return reviewHistory;
      }

      return reviewHistory.filter(
        (review) =>
          review.status ===
          reviewFilter
      );
    }, [
      reviewHistory,
      reviewFilter,
    ]);

  // ==================================================
  // CONFLICT EXPLORER
  // ==================================================

  const openConflictExplorer =
    (conflict) => {
      setSelectedConflict(
        conflict
      );

      setSelectedEvidenceIndex(
        0
      );

      setSelectedReview(
        null
      );
    };

  const closeConflictExplorer =
    () => {
      setSelectedConflict(
        null
      );

      setSelectedEvidenceIndex(
        0
      );
    };

  // ==================================================
  // SELECTED EVIDENCE
  // ==================================================

  const selectedConflictEvidence =
    useMemo(() => {
      if (
        !selectedConflict ||
        !Array.isArray(
          selectedConflict.evidence
        )
      ) {
        return [];
      }

      return selectedConflict.evidence;
    }, [
      selectedConflict,
    ]);

  const currentEvidence =
    selectedConflictEvidence[
      selectedEvidenceIndex
    ];

  const goToPreviousEvidence =
    () => {
      if (
        selectedEvidenceIndex <=
        0
      ) {
        return;
      }

      setSelectedEvidenceIndex(
        (previous) =>
          previous - 1
      );
    };

  const goToNextEvidence =
    () => {
      if (
        selectedEvidenceIndex >=
        selectedConflictEvidence.length -
          1
      ) {
        return;
      }

      setSelectedEvidenceIndex(
        (previous) =>
          previous + 1
      );
    };

  const goToEvidence =
    (index) => {
      setSelectedEvidenceIndex(
        index
      );
    };

  // ==================================================
  // EVIDENCE RENDERER
  // ==================================================

  const renderEvidence =
    (conflict) => {
      if (
        !Array.isArray(
          conflict.evidence
        )
      ) {
        return null;
      }

      return (
        <div className="evidence">

          <h5>
            Conflicting Evidence
          </h5>

          {conflict.evidence.map(
            (
              evidence,
              index
            ) => {

              if (
                evidence ===
                  null ||
                evidence ===
                  undefined
              ) {
                return null;
              }

              if (
                typeof evidence !==
                "object"
              ) {
                return (
                  <button
                    type="button"
                    className="evidence-item evidence-clickable"
                    key={index}
                    onClick={() => {
                      openConflictExplorer(
                        conflict
                      );

                      setSelectedEvidenceIndex(
                        index
                      );
                    }}
                  >
                    <p>
                      {String(
                        evidence
                      )}
                    </p>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  className="evidence-item evidence-clickable"
                  key={index}
                  onClick={() => {
                    if (
                      evidence.chapter !==
                      undefined
                    ) {
                      openChapterExplorer(
                        evidence.chapter
                      );
                    } else {
                      openConflictExplorer(
                        conflict
                      );

                      setSelectedEvidenceIndex(
                        index
                      );
                    }
                  }}
                >

                  <div className="evidence-meta">

                    {evidence.chapter !==
                      undefined && (
                      <div>

                        <span>
                          Chapter
                        </span>

                        <strong>
                          {
                            evidence.chapter
                          }
                        </strong>

                      </div>
                    )}

                    {evidence.age !==
                      undefined && (
                      <div>

                        <span>
                          Age
                        </span>

                        <strong>
                          {
                            evidence.age
                          }
                        </strong>

                      </div>
                    )}

                    {evidence.month &&
                      evidence.year && (
                      <div>

                        <span>
                          Date
                        </span>

                        <strong>
                          {formatDate(
                            evidence.month,
                            evidence.year
                          )}
                        </strong>

                      </div>
                    )}

                  </div>

                  {evidence.detail && (
                    <p>
                      {
                        evidence.detail
                      }
                    </p>
                  )}

                  {evidence.relationship && (
                    <p>
                      {
                        evidence.relationship
                      }
                    </p>
                  )}

                  <span className="evidence-open-label">
                    Open in Explorer →
                  </span>

                </button>
              );
            }
          )}

        </div>
      );
    };

  // ==================================================
  // RELATED CANON
  // ==================================================

  const renderRelatedCanon =
    (conflict) => {

      const relatedCanon =
        conflict?.related_canon;

      if (
        !relatedCanon ||
        relatedCanon.available !==
          true
      ) {
        return null;
      }

      const matches =
        Array.isArray(
          relatedCanon.matches
        )
          ? relatedCanon.matches
          : [];

      const terms =
        Array.isArray(
          relatedCanon.conflict_terms
        )
          ? relatedCanon.conflict_terms
          : [];

      const evidenceChapters =
        Array.isArray(
          relatedCanon.evidence_chapters
        )
          ? relatedCanon.evidence_chapters
          : [];

      const matchCount =
        relatedCanon.match_count ??
        matches.length;

      return (
        <div className="related-canon">

          <div className="related-canon-header">

            <div>

              <p className="analysis-label">
                RELATED CANON
              </p>

              <h5>
                Related Canon Evidence
              </h5>

              <p>
                Canon facts related to
                this detected conflict.
              </p>

            </div>

            <span className="related-canon-count">
              {matchCount}
            </span>

          </div>

          {terms.length > 0 && (
            <div className="related-canon-terms">

              {terms.map(
                (
                  term,
                  index
                ) => (
                  <span
                    className="related-canon-term"
                    key={`${term}-${index}`}
                  >
                    {term}
                  </span>
                )
              )}

            </div>
          )}

          {evidenceChapters.length >
            0 && (
            <div className="related-canon-evidence-chapters">

              {evidenceChapters.map(
                (
                  chapter
                ) => (
                  <button
                    type="button"
                    className="related-canon-evidence-chapter"
                    key={chapter}
                    onClick={() =>
                      openChapterExplorer(
                        chapter
                      )
                    }
                  >
                    Chapter {chapter}
                  </button>
                )
              )}

            </div>
          )}

          {matches.length >
          0 ? (

            <div className="related-canon-matches">

              {matches.map(
                (
                  match,
                  index
                ) => {

                  const chapter =
                    match?.chapter ??
                    match?.fact?.chapter;

                  const section =
                    match?.section ||
                    "canon";

                  const fact =
                    match?.fact;

                  const factText =
                    typeof fact ===
                    "object"
                      ? fact?.fact ||
                        fact?.description ||
                        fact?.text ||
                        JSON.stringify(
                          fact
                        )
                      : String(
                          fact ??
                          ""
                        );

                  const relevance =
                    match?.relevance_score;

                  return (
                    <div
                      className="related-canon-match"
                      key={`${chapter}-${index}`}
                    >

                      <div className="related-canon-match-top">

                        <span className="related-canon-match-section">
                          {formatConflictType(
                            section
                          )}
                        </span>

                        {relevance !==
                          undefined &&
                          relevance !==
                            null && (
                          <span className="related-canon-relevance">
                            Score{" "}
                            {relevance}
                          </span>
                        )}

                      </div>

                      {chapter !==
                        undefined &&
                        chapter !==
                          null && (
                        <button
                          type="button"
                          className="related-canon-chapter-button"
                          onClick={() =>
                            openChapterExplorer(
                              chapter
                            )
                          }
                        >

                          <span>
                            Chapter
                          </span>

                          <strong>
                            {chapter}
                          </strong>

                          <span>
                            Open →
                          </span>

                        </button>
                      )}

                      <p className="related-canon-fact">
                        {factText}
                      </p>

                      {match?.index !==
                        undefined &&
                        match?.index !==
                          null && (
                        <div className="related-canon-index">
                          Canon index{" "}
                          {match.index}
                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>

          ) : (

            <div className="related-canon-empty">
              No related canon matches
              were returned for this
              conflict.
            </div>

          )}

        </div>
      );
    };

  // ==================================================
  // CANON EXPLORER
  // ==================================================

  const renderCanonExplorer =
    () => {

      if (
        !result?.filename ||
        !canonData
      ) {
        return null;
      }

      const sections = [
        {
          key:
            "characters",
          label:
            "Characters",
        },
        {
          key:
            "events",
          label:
            "Events",
        },
        {
          key:
            "locations",
          label:
            "Locations",
        },
        {
          key:
            "timeline",
          label:
            "Timeline",
        },
        {
          key:
            "relationships",
          label:
            "Relationships",
        },
      ];

      const currentValue =
        getCanonValue(
          canonSection
        );

      const isArray =
        Array.isArray(
          currentValue
        );

      const entries =
        isArray
          ? currentValue
          : Object.entries(
              currentValue ||
                {}
            );

      return (
        <section className="dashboard-section canon-explorer-section">

          <div className="section-heading">

            <div>

              <p className="analysis-label">
                CANON EXPLORER
              </p>

              <h3>
                Manuscript Canon
              </h3>

              <p>
                Explore the established
                story facts extracted
                from the manuscript.
              </p>

            </div>

            <button
              type="button"
              className="history-refresh-button"
              onClick={() =>
                loadCanon(
                  result.filename
                )
              }
              disabled={
                loadingCanon
              }
            >
              {loadingCanon
                ? "Refreshing..."
                : "Refresh Canon"}
            </button>

          </div>

          <div className="review-filters canon-section-filters">

            {sections.map(
              (section) => (
                <button
                  type="button"
                  key={
                    section.key
                  }
                  className={
                    canonSection ===
                    section.key
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setCanonSection(
                      section.key
                    )
                  }
                >
                  {
                    section.label
                  }
                </button>
              )
            )}

          </div>

          <div className="canon-explorer-summary">

            {sections.map(
              (section) => {

                const value =
                  getCanonValue(
                    section.key
                  );

                const count =
                  Array.isArray(
                    value
                  )
                    ? value.length
                    : Object.keys(
                        value ||
                          {}
                      ).length;

                return (
                  <button
                    type="button"
                    key={
                      section.key
                    }
                    className={
                      canonSection ===
                      section.key
                        ? "canon-explorer-stat active"
                        : "canon-explorer-stat"
                    }
                    onClick={() =>
                      setCanonSection(
                        section.key
                      )
                    }
                  >

                    <strong>
                      {count}
                    </strong>

                    <span>
                      {
                        section.label
                      }
                    </span>

                  </button>
                );
              }
            )}

          </div>

          <div className="dashboard-panel canon-explorer-panel">

            <div className="dashboard-panel-header">

              <div>

                <p className="analysis-label">
                  CURRENT SECTION
                </p>

                <h4>
                  {
                    sections.find(
                      (item) =>
                        item.key ===
                        canonSection
                    )?.label
                  }
                </h4>

              </div>

              <strong className="dashboard-percentage">
                {entries.length}
              </strong>

            </div>

            {entries.length ===
            0 ? (

              <div className="dashboard-empty">
                No canon data is
                available in this
                section.
              </div>

            ) : (

              <div className="canon-explorer-viewport">

                {isArray
                  ? entries.map(
                      (
                        item,
                        index
                      ) => {

                        const chapter =
                          getCanonChapter(
                            item
                          );

                        return (
                          <details
                            className="canon-explorer-item"
                            key={index}
                          >

                            <summary>

                              <span className="canon-item-title">
                                {getDisplayName(
                                  item,
                                  `${formatConflictType(
                                    canonSection
                                  )} ${
                                    index + 1
                                  }`
                                )}
                              </span>

                              <span className="canon-item-toggle">
                                +
                              </span>

                            </summary>

                            <div className="canon-explorer-content">

                              <div className="canon-explorer-content-inner">

                                {renderCanonObject(
                                  item
                                )}

                                {chapter !==
                                  null && (
                                  <button
                                    type="button"
                                    className="chapter-explorer-inline-button"
                                    onClick={() =>
                                      openChapterExplorer(
                                        chapter
                                      )
                                    }
                                  >
                                    Open Chapter{" "}
                                    {chapter}{" "}
                                    in Explorer →
                                  </button>
                                )}

                              </div>

                            </div>

                          </details>
                        );
                      }
                    )

                  : entries.map(
                      (
                        [
                          key,
                          value,
                        ]
                      ) => {

                        const chapter =
                          getCanonChapter(
                            value
                          );

                        return (
                          <details
                            className="canon-explorer-item"
                            key={key}
                          >

                            <summary>

                              <span className="canon-item-title">
                                {getDisplayName(
                                  value,
                                  key
                                )}
                              </span>

                              <span className="canon-item-toggle">
                                +
                              </span>

                            </summary>

                            <div className="canon-explorer-content">

                              <div className="canon-explorer-content-inner">

                                {renderCanonObject(
                                  value
                                )}

                                {chapter !==
                                  null && (
                                  <button
                                    type="button"
                                    className="chapter-explorer-inline-button"
                                    onClick={() =>
                                      openChapterExplorer(
                                        chapter
                                      )
                                    }
                                  >
                                    Open Chapter{" "}
                                    {chapter}{" "}
                                    in Explorer →
                                  </button>
                                )}

                              </div>

                            </div>

                          </details>
                        );
                      }
                    )}

              </div>

            )}

          </div>

        </section>
      );
    };

  // ==================================================
  // FIND CONFLICTS FOR CHAPTER
  // ==================================================

  const getChapterConflicts =
    (chapterNumber) => {

      if (
        !continuityResult ||
        !Array.isArray(
          continuityResult.conflicts
        )
      ) {
        return [];
      }

      const number =
        Number(
          chapterNumber
        );

      return continuityResult.conflicts.filter(
        (conflict) => {

          const evidence =
            Array.isArray(
              conflict.evidence
            )
              ? conflict.evidence
              : [];

          const evidenceMatch =
            evidence.some(
              (item) =>
                item &&
                Number(
                  item.chapter
                ) === number
            );

          const canon =
            conflict.related_canon;

          const canonMatch =
            Array.isArray(
              canon?.evidence_chapters
            ) &&
            canon.evidence_chapters.some(
              (chapter) =>
                Number(
                  chapter
                ) === number
            );

          return (
            evidenceMatch ||
            canonMatch
          );
        }
      );
    };

  // ==================================================
  // CHAPTER EXPLORER
  // ==================================================

  const renderChapterExplorer =
    () => {

      if (
        !chapterExplorerOpen
      ) {
        return null;
      }

      const chapterNumber =
        selectedChapter?.chapter_number;

      const chapterIndex =
        chapterList.findIndex(
          (chapter) =>
            Number(
              chapter.chapter_number
            ) ===
            Number(
              chapterNumber
            )
        );

      const canGoPrevious =
        chapterIndex > 0;

      const canGoNext =
        chapterIndex >= 0 &&
        chapterIndex <
          chapterList.length - 1;

      const facts =
        selectedChapter?.facts ||
        {};

      const characters =
        Array.isArray(
          facts.characters
        )
          ? facts.characters
          : [];

      const events =
        Array.isArray(
          facts.events
        )
          ? facts.events
          : [];

      const locations =
        Array.isArray(
          facts.locations
        )
          ? facts.locations
          : [];

      const timeline =
        Array.isArray(
          facts.timeline
        )
          ? facts.timeline
          : [];

      const relationships =
        Array.isArray(
          facts.relationships
        )
          ? facts.relationships
          : [];

      const chapterConflicts =
        getChapterConflicts(
          chapterNumber
        );

      const renderFactList =
        (
          items,
          emptyText
        ) => {

          if (!items.length) {
            return (
              <div className="chapter-empty">
                {emptyText}
              </div>
            );
          }

          return (
            <div className="chapter-fact-list">

              {items.map(
                (
                  item,
                  index
                ) => (

                  <details
                    className="chapter-fact-item"
                    key={index}
                    open={
                      items.length ===
                      1
                    }
                  >

                    <summary>

                      <span>
                        {getDisplayName(
                          item,
                          `Fact ${
                            index + 1
                          }`
                        )}
                      </span>

                      <strong>
                        +
                      </strong>

                    </summary>

                    <div className="chapter-fact-content">

                      {renderCanonObject(
                        item
                      )}

                    </div>

                  </details>

                )
              )}

            </div>
          );
        };

      return (
        <div
          className="chapter-explorer-overlay"
          onClick={
            closeChapterExplorer
          }
        >

          <div
            className="chapter-explorer-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="chapter-explorer-header">

              <div>

                <p className="analysis-label">
                  MANUSCRIPT EXPLORER
                </p>

                <h3>
                  {selectedChapter
                    ? selectedChapter.title ||
                      `Chapter ${chapterNumber}`
                    : "Chapter Explorer"}
                </h3>

                {selectedChapter && (
                  <p>
                    Chapter{" "}
                    {
                      selectedChapter.chapter_number
                    }
                    {" · "}
                    {selectedChapter.status ||
                      "unknown"}
                  </p>
                )}

              </div>

              <button
                type="button"
                className="review-modal-close"
                onClick={
                  closeChapterExplorer
                }
              >
                ×
              </button>

            </div>

            <div className="chapter-explorer-body">

              <aside className="chapter-explorer-sidebar">

                <div className="chapter-sidebar-header">

                  <div>

                    <p className="analysis-label">
                      CHAPTERS
                    </p>

                    <h4>
                      Manuscript
                    </h4>

                  </div>

                  <strong>
                    {
                      chapterList.length
                    }
                  </strong>

                </div>

                {loadingChapters &&
                  chapterList.length ===
                    0 && (
                    <div className="chapter-sidebar-loading">
                      Loading chapters...
                    </div>
                  )}

                <div className="chapter-list">

                  {chapterList.map(
                    (
                      chapter
                    ) => {

                      const isActive =
                        Number(
                          chapter.chapter_number
                        ) ===
                        Number(
                          chapterNumber
                        );

                      return (
                        <button
                          type="button"
                          key={
                            chapter.chapter_number
                          }
                          className={
                            isActive
                              ? "chapter-list-item active"
                              : "chapter-list-item"
                          }
                          onClick={() =>
                            openChapterExplorer(
                              chapter.chapter_number
                            )
                          }
                        >

                          <span>
                            Chapter{" "}
                            {
                              chapter.chapter_number
                            }
                          </span>

                          <strong>
                            {chapter.status ===
                            "success"
                              ? "✓"
                              : "!"}
                          </strong>

                        </button>
                      );
                    }
                  )}

                </div>

              </aside>

              <div className="chapter-explorer-content-area">

                {chapterExplorerError && (
                  <div className="error-message chapter-explorer-error">

                    <strong>
                      Unable to load chapter
                    </strong>

                    <p>
                      {
                        chapterExplorerError
                      }
                    </p>

                  </div>
                )}

                {loadingChapter && (
                  <div className="chapter-loading">

                    <div className="spinner" />

                    <strong>
                      Loading Chapter{" "}
                      {
                        chapterNumber
                      }
                      ...
                    </strong>

                    <p>
                      Loading the stored
                      chapter analysis.
                    </p>

                  </div>
                )}

                {!loadingChapter &&
                  selectedChapter && (

                    <div className="chapter-detail">

                      <div className="chapter-detail-heading">

                        <div>

                          <p className="analysis-label">
                            CURRENT CHAPTER
                          </p>

                          <h4>
                            {
                              selectedChapter.title ||
                              `Chapter ${chapterNumber}`
                            }
                          </h4>

                        </div>

                        <span className="chapter-detail-number">
                          {
                            chapterNumber
                          }
                        </span>

                      </div>

                      <div className="chapter-fact-summary">

                        <div>
                          <strong>
                            {
                              characters.length
                            }
                          </strong>
                          <span>
                            Characters
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              events.length
                            }
                          </strong>
                          <span>
                            Events
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              locations.length
                            }
                          </strong>
                          <span>
                            Locations
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              timeline.length
                            }
                          </strong>
                          <span>
                            Timeline
                          </span>
                        </div>

                        <div>
                          <strong>
                            {
                              relationships.length
                            }
                          </strong>
                          <span>
                            Relationships
                          </span>
                        </div>

                      </div>

                      {chapterConflicts.length >
                        0 && (

                        <section className="chapter-related-conflicts">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                CONTINUITY
                              </p>

                              <h5>
                                Related Conflicts
                              </h5>

                              <p>
                                Conflicts involving
                                this chapter.
                              </p>

                            </div>

                            <strong>
                              {
                                chapterConflicts.length
                              }
                            </strong>

                          </div>

                          <div className="chapter-related-conflict-list">

                            {chapterConflicts.map(
                              (
                                conflict
                              ) => (

                                <button
                                  type="button"
                                  className="chapter-related-conflict-card"
                                  key={
                                    conflict.conflict_id ||
                                    `${conflict.type}-${conflict.message}`
                                  }
                                  onClick={() => {

                                    closeChapterExplorer();

                                    openConflictExplorer(
                                      conflict
                                    );

                                  }}
                                >

                                  <div>

                                    <span className="conflict-type">
                                      {formatConflictType(
                                        conflict.type
                                      )}
                                    </span>

                                    <h5>
                                      {
                                        conflict.message
                                      }
                                    </h5>

                                  </div>

                                  <div className="chapter-related-conflict-meta">

                                    <span
                                      className={`review-status review-status-${getConflictReviewStatus(
                                        conflict
                                      )}`}
                                    >
                                      {formatStatus(
                                        getConflictReviewStatus(
                                          conflict
                                        )
                                      )}
                                    </span>

                                    <strong>
                                      Open →
                                    </strong>

                                  </div>

                                </button>

                              )
                            )}

                          </div>

                        </section>

                      )}

                      <div className="chapter-fact-sections">

                        <section className="chapter-fact-section">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                CHARACTERS
                              </p>

                              <h5>
                                Chapter Characters
                              </h5>

                            </div>

                            <strong>
                              {
                                characters.length
                              }
                            </strong>

                          </div>

                          {renderFactList(
                            characters,
                            "No character facts were extracted from this chapter."
                          )}

                        </section>

                        <section className="chapter-fact-section">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                EVENTS
                              </p>

                              <h5>
                                Chapter Events
                              </h5>

                            </div>

                            <strong>
                              {
                                events.length
                              }
                            </strong>

                          </div>

                          {renderFactList(
                            events,
                            "No event facts were extracted from this chapter."
                          )}

                        </section>

                        <section className="chapter-fact-section">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                LOCATIONS
                              </p>

                              <h5>
                                Chapter Locations
                              </h5>

                            </div>

                            <strong>
                              {
                                locations.length
                              }
                            </strong>

                          </div>

                          {renderFactList(
                            locations,
                            "No location facts were extracted from this chapter."
                          )}

                        </section>

                        <section className="chapter-fact-section">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                TIMELINE
                              </p>

                              <h5>
                                Chapter Timeline
                              </h5>

                            </div>

                            <strong>
                              {
                                timeline.length
                              }
                            </strong>

                          </div>

                          {renderFactList(
                            timeline,
                            "No timeline facts were extracted from this chapter."
                          )}

                        </section>

                        <section className="chapter-fact-section">

                          <div className="chapter-fact-section-header">

                            <div>

                              <p className="analysis-label">
                                RELATIONSHIPS
                              </p>

                              <h5>
                                Chapter Relationships
                              </h5>

                            </div>

                            <strong>
                              {
                                relationships.length
                              }
                            </strong>

                          </div>

                          {renderFactList(
                            relationships,
                            "No relationship facts were extracted from this chapter."
                          )}

                        </section>

                      </div>

                    </div>

                  )}

              </div>

            </div>

            <div className="chapter-explorer-footer">

              <button
                type="button"
                className="review-button"
                disabled={
                  !canGoPrevious ||
                  loadingChapter
                }
                onClick={() =>
                  navigateChapter(
                    -1
                  )
                }
              >
                ← Previous Chapter
              </button>

              <span>
                {selectedChapter
                  ? `Chapter ${chapterNumber} of ${chapterList.length}`
                  : "Select a chapter"}
              </span>

              <button
                type="button"
                className="review-button"
                disabled={
                  !canGoNext ||
                  loadingChapter
                }
                onClick={() =>
                  navigateChapter(
                    1
                  )
                }
              >
                Next Chapter →
              </button>

            </div>

          </div>

        </div>
      );
    };

  // ==================================================
  // CONFLICT EXPLORER MODAL
  // ==================================================

  const renderConflictExplorer =
    () => {

      if (
        !selectedConflict
      ) {
        return null;
      }

      const evidenceCount =
        selectedConflictEvidence.length;

      const currentStatus =
        getConflictReviewStatus(
          selectedConflict
        );

      const conflictId =
        selectedConflict.conflict_id ||
        `${selectedConflict.type}-${selectedConflict.message}`;

      const isSaving =
        savingReviewId ===
        conflictId;

      return (
        <div
          className="review-modal-overlay conflict-explorer-overlay"
          onClick={
            closeConflictExplorer
          }
        >

          <div
            className="review-modal conflict-explorer-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="review-modal-header">

              <div>

                <p className="analysis-label">
                  CONFLICT EXPLORER
                </p>

                <h3>
                  {formatConflictType(
                    selectedConflict.type
                  )}
                </h3>

              </div>

              <button
                type="button"
                className="review-modal-close"
                onClick={
                  closeConflictExplorer
                }
              >
                ×
              </button>

            </div>

            <div className="conflict-explorer-summary">

              <div>

                <span>
                  Severity
                </span>

                <strong>
                  {
                    selectedConflict.severity ||
                    "Unknown"
                  }
                </strong>

              </div>

              <div>

                <span>
                  Review Status
                </span>

                <strong
                  className={`review-status review-status-${currentStatus}`}
                >
                  {formatStatus(
                    currentStatus
                  )}
                </strong>

              </div>

              <div>

                <span>
                  Evidence
                </span>

                <strong>
                  {
                    evidenceCount
                  }
                </strong>

              </div>

            </div>

            <div className="review-modal-message">

              <span>
                Detected Conflict
              </span>

              <h4>
                {
                  selectedConflict.message
                }
              </h4>

            </div>

            {selectedConflict.character && (
              <div className="history-meta">

                <span>
                  Character
                </span>

                <strong>
                  {
                    selectedConflict.character
                  }
                </strong>

              </div>
            )}

            {/* ======================================
                CONFLICT INTELLIGENCE
            ====================================== */}

            {renderConflictIntelligence(
              selectedConflict
            )}

            {/* ======================================
                EVIDENCE NAVIGATION
            ====================================== */}

            {evidenceCount > 0 && (
              <div className="conflict-explorer-evidence">

                <div className="conflict-explorer-section-header">

                  <div>

                    <p className="analysis-label">
                      EVIDENCE NAVIGATION
                    </p>

                    <h4>
                      Conflicting Evidence
                    </h4>

                  </div>

                  <span className="evidence-counter">
                    {selectedEvidenceIndex + 1}
                    {" / "}
                    {evidenceCount}
                  </span>

                </div>

                <div className="evidence-navigation">

                  {selectedConflictEvidence.map(
                    (
                      evidence,
                      index
                    ) => {

                      const chapter =
                        typeof evidence ===
                          "object"
                          ? evidence.chapter
                          : null;

                      const isActive =
                        index ===
                        selectedEvidenceIndex;

                      return (
                        <button
                          type="button"
                          key={index}
                          className={
                            isActive
                              ? "evidence-nav-button active"
                              : "evidence-nav-button"
                          }
                          onClick={() =>
                            goToEvidence(
                              index
                            )
                          }
                        >

                          <span>
                            Evidence{" "}
                            {index + 1}
                          </span>

                          {chapter !==
                            undefined &&
                            chapter !==
                              null && (
                            <strong>
                              Ch.{" "}
                              {chapter}
                            </strong>
                          )}

                        </button>
                      );
                    }
                  )}

                </div>

                {currentEvidence && (
                  <div className="selected-evidence">

                    <div className="selected-evidence-header">

                      <div>

                        <span>
                          Evidence{" "}
                          {
                            selectedEvidenceIndex +
                            1
                          }
                        </span>

                        <h4>
                          {typeof currentEvidence ===
                          "object"
                            ? currentEvidence.chapter !==
                              undefined
                              ? `Chapter ${currentEvidence.chapter}`
                              : "Manuscript Evidence"
                            : "Manuscript Evidence"}
                        </h4>

                      </div>

                      {typeof currentEvidence ===
                        "object" &&
                        currentEvidence.month &&
                        currentEvidence.year && (
                        <strong>
                          {formatDate(
                            currentEvidence.month,
                            currentEvidence.year
                          )}
                        </strong>
                      )}

                    </div>

                    {typeof currentEvidence ===
                    "object" ? (
                      <>

                        {currentEvidence.detail && (
                          <p className="selected-evidence-detail">
                            {
                              currentEvidence.detail
                            }
                          </p>
                        )}

                        {currentEvidence.relationship && (
                          <p className="selected-evidence-detail">
                            {
                              currentEvidence.relationship
                            }
                          </p>
                        )}

                        {currentEvidence.age !==
                          undefined && (
                          <div className="history-meta">

                            <span>
                              Age
                            </span>

                            <strong>
                              {
                                currentEvidence.age
                              }
                            </strong>

                          </div>
                        )}

                        {currentEvidence.chapter !==
                          undefined && (
                          <button
                            type="button"
                            className="chapter-explorer-inline-button"
                            onClick={() =>
                              openChapterExplorer(
                                currentEvidence.chapter
                              )
                            }
                          >
                            Open Chapter{" "}
                            {
                              currentEvidence.chapter
                            }{" "}
                            in Explorer →
                          </button>
                        )}

                      </>
                    ) : (
                      <p className="selected-evidence-detail">
                        {String(
                          currentEvidence
                        )}
                      </p>
                    )}

                  </div>
                )}

                <div className="evidence-pagination">

                  <button
                    type="button"
                    className="review-button"
                    disabled={
                      selectedEvidenceIndex ===
                      0
                    }
                    onClick={
                      goToPreviousEvidence
                    }
                  >
                    ← Previous Evidence
                  </button>

                  <button
                    type="button"
                    className="review-button"
                    disabled={
                      selectedEvidenceIndex >=
                      evidenceCount -
                        1
                    }
                    onClick={
                      goToNextEvidence
                    }
                  >
                    Next Evidence →
                  </button>

                </div>

              </div>
            )}

            {/* ======================================
                RELATED CANON
            ====================================== */}

            {renderRelatedCanon(
              selectedConflict
            )}

            {/* ======================================
                REVIEW DECISION
            ====================================== */}

            <div className="review-modal-actions">

              <p>
                Author Review
              </p>

              <div className="review-buttons">

                <button
                  type="button"
                  className={`review-button ${
                    currentStatus ===
                    "confirmed"
                      ? "active-confirm"
                      : ""
                  }`}
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    handleReviewDecision(
                      selectedConflict,
                      "confirmed"
                    )
                  }
                >
                  Confirm
                </button>

                <button
                  type="button"
                  className={`review-button ${
                    currentStatus ===
                    "dismissed"
                      ? "active-dismiss"
                      : ""
                  }`}
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    handleReviewDecision(
                      selectedConflict,
                      "dismissed"
                    )
                  }
                >
                  Dismiss
                </button>

                <button
                  type="button"
                  className={`review-button ${
                    currentStatus ===
                    "needs_review"
                      ? "active-review"
                      : ""
                  }`}
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    handleReviewDecision(
                      selectedConflict,
                      "needs_review"
                    )
                  }
                >
                  Review Later
                </button>

              </div>

            </div>

            <button
              type="button"
              className="review-modal-done"
              onClick={
                closeConflictExplorer
              }
            >
              Close Explorer
            </button>

          </div>

        </div>
      );
    };

  // ==================================================
  // RENDER REVIEW HISTORY
  // ==================================================

  const renderReviewHistory =
    () => {

      if (
        !result?.filename
      ) {
        return null;
      }

      return (
        <section className="review-history-section">

          <div className="section-heading">

            <div>

              <p className="analysis-label">
                REVIEW MANAGEMENT
              </p>

              <h3>
                Review History
              </h3>

              <p>
                Review decisions are
                saved separately from
                the continuity analysis.
              </p>

            </div>

            <button
              className="history-refresh-button"
              onClick={() =>
                loadReviewHistory(
                  result.filename
                )
              }
              disabled={
                loadingHistory
              }
            >
              {loadingHistory
                ? "Refreshing..."
                : "Refresh History"}
            </button>

          </div>

          <div className="review-history-summary">

            <div>
              <strong>
                {
                  reviewHistory.length
                }
              </strong>

              <span>
                Saved Reviews
              </span>
            </div>

            <div>
              <strong>
                {
                  reviewHistory.filter(
                    (item) =>
                      item.status ===
                      "confirmed"
                  ).length
                }
              </strong>

              <span>
                Confirmed
              </span>
            </div>

            <div>
              <strong>
                {
                  reviewHistory.filter(
                    (item) =>
                      item.status ===
                      "dismissed"
                  ).length
                }
              </strong>

              <span>
                Dismissed
              </span>
            </div>

            <div>
              <strong>
                {
                  reviewHistory.filter(
                    (item) =>
                      item.status ===
                      "needs_review"
                  ).length
                }
              </strong>

              <span>
                Needs Review
              </span>
            </div>

          </div>

          <div className="review-filters">

            {[
              [
                "all",
                "All",
              ],
              [
                "needs_review",
                "Needs Review",
              ],
              [
                "confirmed",
                "Confirmed",
              ],
              [
                "dismissed",
                "Dismissed",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  type="button"
                  key={value}
                  className={
                    reviewFilter ===
                    value
                      ? "filter-button active"
                      : "filter-button"
                  }
                  onClick={() =>
                    setReviewFilter(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}

          </div>

          {loadingHistory && (
            <div className="history-loading">
              Loading review history...
            </div>
          )}

          {!loadingHistory &&
            filteredReviewHistory.length ===
              0 && (
              <div className="history-empty">

                <div className="history-empty-icon">
                  ✓
                </div>

                <h4>
                  No saved reviews
                </h4>

                <p>
                  Review decisions
                  will appear here
                  after you review
                  a conflict.
                </p>

              </div>
            )}

          {!loadingHistory &&
            filteredReviewHistory.length >
              0 && (
              <div className="history-list">

                {filteredReviewHistory.map(
                  (
                    review
                  ) => (
                    <button
                      type="button"
                      className={`history-card history-${review.status}`}
                      key={
                        review.conflict_id
                      }
                      onClick={() =>
                        setSelectedReview(
                          review
                        )
                      }
                    >

                      <div className="history-card-top">

                        <div>

                          <p className="conflict-type">
                            {formatConflictType(
                              review.type
                            )}
                          </p>

                          <h4>
                            {
                              review.message
                            }
                          </h4>

                        </div>

                        <span
                          className={`review-status review-status-${review.status}`}
                        >
                          {formatStatus(
                            review.status
                          )}
                        </span>

                      </div>

                      {review.severity && (
                        <div className="history-meta">

                          <span>
                            Severity
                          </span>

                          <strong>
                            {
                              review.severity
                            }
                          </strong>

                        </div>
                      )}

                      {review.character && (
                        <div className="history-meta">

                          <span>
                            Character
                          </span>

                          <strong>
                            {
                              review.character
                            }
                          </strong>

                        </div>
                      )}

                      {Array.isArray(
                        review.evidence
                      ) && (
                        <div className="history-evidence-count">

                          {
                            review.evidence
                              .length
                          }{" "}
                          evidence item
                          {
                            review.evidence
                              .length !==
                            1
                              ? "s"
                              : ""
                          }

                          <span>
                            View Details →
                          </span>

                        </div>
                      )}

                    </button>
                  )
                )}

              </div>
            )}

          {selectedReview && (
            <div
              className="review-modal-overlay"
              onClick={() =>
                setSelectedReview(
                  null
                )
              }
            >

              <div
                className="review-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="review-modal-header">

                  <div>

                    <p className="analysis-label">
                      REVIEWED CONFLICT
                    </p>

                    <h3>
                      {formatConflictType(
                        selectedReview.type
                      )}
                    </h3>

                  </div>

                  <button
                    type="button"
                    className="review-modal-close"
                    onClick={() =>
                      setSelectedReview(
                        null
                      )
                    }
                  >
                    ×
                  </button>

                </div>

                <div className="review-modal-status">

                  <span>
                    Current Decision
                  </span>

                  <strong
                    className={`review-status review-status-${selectedReview.status}`}
                  >
                    {formatStatus(
                      selectedReview.status
                    )}
                  </strong>

                </div>

                <div className="review-modal-message">

                  <span>
                    Conflict
                  </span>

                  <h4>
                    {
                      selectedReview.message
                    }
                  </h4>

                </div>

                {selectedReview.severity && (
                  <div className="history-meta">

                    <span>
                      Severity
                    </span>

                    <strong>
                      {
                        selectedReview.severity
                      }
                    </strong>

                  </div>
                )}

                {renderConflictIntelligence(
                  selectedReview
                )}

                {renderEvidence(
                  selectedReview
                )}

                {renderRelatedCanon(
                  selectedReview
                )}

                <div className="review-modal-actions">

                  <p>
                    Change Review Decision
                  </p>

                  <div className="review-buttons">

                    <button
                      type="button"
                      className="review-button"
                      onClick={() =>
                        handleReviewDecision(
                          selectedReview,
                          "confirmed"
                        )
                      }
                    >
                      Confirm
                    </button>

                    <button
                      type="button"
                      className="review-button"
                      onClick={() =>
                        handleReviewDecision(
                          selectedReview,
                          "dismissed"
                        )
                      }
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      className="review-button"
                      onClick={() =>
                        handleReviewDecision(
                          selectedReview,
                          "needs_review"
                        )
                      }
                    >
                      Review Later
                    </button>

                  </div>

                </div>

                <button
                  type="button"
                  className="review-modal-done"
                  onClick={() =>
                    setSelectedReview(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>
          )}

        </section>
      );
    };

  // ==================================================
  // DASHBOARD
  // ==================================================

  const renderDashboard =
    () => {

      if (
        !dashboard ||
        !result?.filename
      ) {
        return null;
      }

      const overview =
        dashboard.overview ||
        {};

      const severity =
        dashboard.severity ||
        {};

      const conflictTypes =
        dashboard.conflict_types ||
        {};

      const chapterImpact =
        dashboard.chapter_impact ||
        [];

      const completion =
        overview.review_completion ??
        0;

      const total =
        overview.total_conflicts ??
        0;

      const getPercentage =
        (value) => {

          if (!total) {
            return 0;
          }

          return Math.round(
            (value / total) *
              100
          );
        };

      return (
        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <p className="analysis-label">
                MANUSCRIPT ANALYTICS
              </p>

              <h3>
                Continuity Dashboard
              </h3>

              <p>
                A high-level view of
                manuscript consistency
                and review progress.
              </p>

            </div>

            <button
              className="history-refresh-button"
              onClick={() =>
                loadDashboard(
                  result.filename
                )
              }
              disabled={
                loadingDashboard
              }
            >
              {loadingDashboard
                ? "Refreshing..."
                : "Refresh Dashboard"}
            </button>

          </div>

          <div className="dashboard-overview">

            <div className="dashboard-card">
              <span>
                Total Conflicts
              </span>

              <strong>
                {
                  overview.total_conflicts ??
                  0
                }
              </strong>
            </div>

            <div className="dashboard-card dashboard-confirmed">
              <span>
                Confirmed
              </span>

              <strong>
                {
                  overview.confirmed ??
                  0
                }
              </strong>
            </div>

            <div className="dashboard-card dashboard-dismissed">
              <span>
                Dismissed
              </span>

              <strong>
                {
                  overview.dismissed ??
                  0
                }
              </strong>
            </div>

            <div className="dashboard-card dashboard-pending">
              <span>
                Needs Review
              </span>

              <strong>
                {
                  overview.needs_review ??
                  0
                }
              </strong>
            </div>

          </div>

          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>

                <p className="analysis-label">
                  REVIEW PROGRESS
                </p>

                <h4>
                  Conflict Resolution
                </h4>

              </div>

              <strong className="dashboard-percentage">
                {completion}%
              </strong>

            </div>

            <div className="dashboard-progress">

              <div
                className="dashboard-progress-fill"
                style={{
                  width:
                    `${completion}%`,
                }}
              />

            </div>

            <p className="dashboard-progress-text">
              {
                overview.reviewed ??
                0
              }{" "}
              of{" "}
              {
                overview.total_conflicts ??
                0
              }{" "}
              conflicts reviewed.
            </p>

          </div>

          <div className="dashboard-grid">

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>

                  <p className="analysis-label">
                    SEVERITY
                  </p>

                  <h4>
                    Conflict Severity
                  </h4>

                </div>

              </div>

              <div className="dashboard-bars">

                {[
                  [
                    "High",
                    severity.high ||
                      0,
                    "high",
                  ],
                  [
                    "Medium",
                    severity.medium ||
                      0,
                    "medium",
                  ],
                  [
                    "Low",
                    severity.low ||
                      0,
                    "low",
                  ],
                ].map(
                  ([
                    label,
                    value,
                    className,
                  ]) => (
                    <div
                      className="dashboard-bar-row"
                      key={label}
                    >

                      <div className="dashboard-bar-label">

                        <span>
                          {label}
                        </span>

                        <strong>
                          {value}
                        </strong>

                      </div>

                      <div className="dashboard-bar">

                        <div
                          className={`dashboard-bar-fill ${className}`}
                          style={{
                            width:
                              `${getPercentage(
                                value
                              )}%`,
                          }}
                        />

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>

            <div className="dashboard-panel">

              <div className="dashboard-panel-header">

                <div>

                  <p className="analysis-label">
                    TYPES
                  </p>

                  <h4>
                    Conflict Types
                  </h4>

                </div>

              </div>

              <div className="dashboard-type-list">

                {Object.entries(
                  conflictTypes
                ).length ===
                0 ? (
                  <div className="dashboard-empty">
                    No conflict types.
                  </div>
                ) : (
                  Object.entries(
                    conflictTypes
                  ).map(
                    ([
                      type,
                      value,
                    ]) => (
                      <div
                        className="dashboard-type-row"
                        key={type}
                      >

                        <span>
                          {formatConflictType(
                            type
                          )}
                        </span>

                        <strong>
                          {value}
                        </strong>

                      </div>
                    )
                  )
                )}

              </div>

            </div>

          </div>

          <div className="dashboard-panel">

            <div className="dashboard-panel-header">

              <div>

                <p className="analysis-label">
                  CHAPTER IMPACT
                </p>

                <h4>
                  Most Affected Chapters
                </h4>

              </div>

            </div>

            {chapterImpact.length ===
            0 ? (
              <div className="dashboard-empty">
                No affected chapters.
              </div>
            ) : (
              <div className="chapter-impact-list">

                {chapterImpact.map(
                  (
                    item
                  ) => (
                    <button
                      type="button"
                      className="chapter-impact-row"
                      key={
                        item.chapter
                      }
                      onClick={() =>
                        openChapterExplorer(
                          item.chapter
                        )
                      }
                    >

                      <div>

                        <span>
                          Chapter
                        </span>

                        <strong>
                          {
                            item.chapter
                          }
                        </strong>

                      </div>

                      <div className="chapter-impact-count">

                        <strong>
                          {
                            item.conflict_count
                          }
                        </strong>

                        <span>
                          conflict
                          {
                            item.conflict_count !==
                            1
                              ? "s"
                              : ""
                          }
                        </span>

                      </div>

                    </button>
                  )
                )}

              </div>
            )}

          </div>

          <div
            className={`dashboard-status dashboard-status-${dashboard.status}`}
          >

            <div className="dashboard-status-icon">
              {dashboard.status ===
              "consistent"
                ? "✓"
                : dashboard.status ===
                  "reviewed"
                ? "✓"
                : "!"}
            </div>

            <div>

              <p className="analysis-label">
                MANUSCRIPT STATUS
              </p>

              <h4>
                {dashboard.status ===
                "consistent"
                  ? "Consistent"
                  : dashboard.status ===
                    "reviewed"
                  ? "Review Completed"
                  : "Needs Review"}
              </h4>

              <p>
                {dashboard.status ===
                "consistent"
                  ? "No continuity conflicts are currently detected."
                  : dashboard.status ===
                    "reviewed"
                  ? "All detected conflicts have received an author review decision."
                  : "Some detected conflicts still require an author review decision."}
              </p>

            </div>

          </div>

        </section>
      );
    };

  // ==================================================
  // MANUSCRIPTS PAGE
  // ==================================================

  const renderManuscriptsPage = () => (
    <>
      <PageHeader
        eyebrow="MANUSCRIPT WORKSPACE"
        title="Manuscripts"
        description="Upload, analyze, and prepare a manuscript for canon and continuity analysis."
        result={result}
      />

      <section className="upload-card manuscript-page-card">

        {!result && (
          <>
            <div className="upload-icon">
              ↑
            </div>

            <h3>
              Upload your manuscript
            </h3>

            <p>
              Select a PDF manuscript to begin the analysis.
            </p>

            <label className="file-button">
              Choose PDF

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={
                  handleFileChange
                }
              />
            </label>
          </>
        )}

        {file && !result && (
          <div className="selected-file">

            <span>
              ✓
            </span>

            <div>

              <strong>
                {file.name}
              </strong>

              <p>
                {(
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>

            </div>

          </div>
        )}

        {file && !result && (
          <button
            className="analyze-button"
            onClick={
              handleUpload
            }
            disabled={
              uploading
            }
          >
            {uploading
              ? "Analyzing Manuscript..."
              : "Analyze Manuscript"}
          </button>
        )}

        {uploading && (
          <div className="processing">

            <div className="spinner" />

            <strong>
              Analyzing manuscript...
            </strong>

            <p>
              Extracting chapters and story facts.
            </p>

          </div>
        )}

        {error && (
          <div className="error-message">

            <strong>
              Something went wrong
            </strong>

            <p>
              {error}
            </p>

          </div>
        )}

        {result && (
          <div className="analysis-result">

            <p className="analysis-label">
              MANUSCRIPT PROCESSED
            </p>

            <h3>
              {result.filename}
            </h3>

            <p>
              {result.pages} Pages ·{" "}
              {result.chapter_count} Chapters
            </p>

            <div className="stats">

              <div>
                <strong>
                  {result.pages ?? 0}
                </strong>

                <span>
                  Pages
                </span>
              </div>

              <div>
                <strong>
                  {result.chapter_count ?? 0}
                </strong>

                <span>
                  Chapters
                </span>
              </div>

              <div>
                <strong>
                  {result.successful_chapters ?? 0}
                </strong>

                <span>
                  Analyzed
                </span>
              </div>

              <div>
                <strong>
                  {result.failed_chapters ?? 0}
                </strong>

                <span>
                  Failed
                </span>
              </div>

            </div>

            {!canonResult && (
              <button
                className="primary-action"
                onClick={
                  handleBuildCanon
                }
                disabled={
                  buildingCanon
                }
              >
                {buildingCanon
                  ? "Building Canon..."
                  : "Build Canon"}
              </button>
            )}

            {canonResult && (
              <div className="canon-result">

                <div className="canon-icon">
                  ✓
                </div>

                <h3>
                  Canon Built Successfully
                </h3>

                <p>
                  The manuscript's established story facts have been structured.
                </p>

                <div className="canon-stats">

                  <div>
                    <strong>
                      {canonResult.character_count}
                    </strong>

                    <span>
                      Characters
                    </span>
                  </div>

                  <div>
                    <strong>
                      {canonResult.event_count}
                    </strong>

                    <span>
                      Events
                    </span>
                  </div>

                  <div>
                    <strong>
                      {canonResult.location_count}
                    </strong>

                    <span>
                      Locations
                    </span>
                  </div>

                  <div>
                    <strong>
                      {canonResult.timeline_count}
                    </strong>

                    <span>
                      Timeline
                    </span>
                  </div>

                  <div>
                    <strong>
                      {canonResult.relationship_count}
                    </strong>

                    <span>
                      Relationships
                    </span>
                  </div>

                </div>

                <button
                  className="continuity-button"
                  onClick={() =>
                    navigateToPage(
                      "continuity"
                    )
                  }
                >
                  Open Continuity Workspace →
                </button>

              </div>
            )}

          </div>
        )}

      </section>

      {result && (
        <section className="workspace-shortcuts">

          <button
            type="button"
            onClick={() =>
              navigateToPage(
                "canon"
              )
            }
          >
            <span>
              ◈
            </span>

            <div>
              <strong>
                Canon Explorer
              </strong>

              <small>
                Explore established story facts
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToPage(
                "continuity"
              )
            }
          >
            <span>
              ◌
            </span>

            <div>
              <strong>
                Continuity
              </strong>

              <small>
                Run and inspect consistency checks
              </small>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              navigateToPage(
                "reviews"
              )
            }
          >
            <span>
              ✓
            </span>

            <div>
              <strong>
                Reviews
              </strong>

              <small>
                Manage author review decisions
              </small>
            </div>
          </button>

        </section>
      )}

    </>
  );

  // ==================================================
  // DASHBOARD PAGE
  // ==================================================

  const renderDashboardPage = () => (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="Dashboard"
        description="A clean overview of manuscript consistency, conflicts, and review progress."
        result={result}
      />

      {!result && (
        <div className="page-empty-state">

          <div className="page-empty-icon">
            C
          </div>

          <p className="analysis-label">
            GET STARTED
          </p>

          <h3>
            Your manuscript workspace is ready.
          </h3>

          <p>
            Upload a PDF to begin extracting chapters, building canon, and checking continuity.
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              navigateToPage(
                "manuscripts"
              )
            }
          >
            Go to Manuscripts →
          </button>

        </div>
      )}

      {result &&
        dashboard &&
        renderDashboard()}

      {result &&
        !dashboard && (
          <div className="page-empty-state">

            <div className="page-empty-icon">
              ⌁
            </div>

            <p className="analysis-label">
              MANUSCRIPT ANALYTICS
            </p>

            <h3>
              Dashboard data is not loaded yet.
            </h3>

            <p>
              Load the latest manuscript analytics.
            </p>

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                loadDashboard(
                  result.filename
                )
              }
              disabled={
                loadingDashboard
              }
            >
              {loadingDashboard
                ? "Loading Dashboard..."
                : "Load Dashboard"}
            </button>

          </div>
        )}

    </>
  );

  // ==================================================
  // CANON PAGE
  // ==================================================

  const renderCanonPage = () => (
    <>
      <PageHeader
        eyebrow="CANON EXPLORER"
        title="Canon Explorer"
        description="Browse characters, events, locations, timeline facts, and relationships extracted from the manuscript."
        result={result}
      />

      {!result && (
        <div className="page-empty-state">

          <div className="page-empty-icon">
            ◈
          </div>

          <p className="analysis-label">
            CANON
          </p>

          <h3>
            No manuscript selected.
          </h3>

          <p>
            Upload and analyze a manuscript before exploring its canon.
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              navigateToPage(
                "manuscripts"
              )
            }
          >
            Go to Manuscripts →
          </button>

        </div>
      )}

      {result &&
        !canonData && (
          <div className="page-empty-state">

            <div className="page-empty-icon">
              ◈
            </div>

            <p className="analysis-label">
              CANON
            </p>

            <h3>
              The canon has not been built yet.
            </h3>

            <p>
              Build the canon from the Manuscripts page to unlock the explorer.
            </p>

            <button
              type="button"
              className="primary-action"
              onClick={
                handleBuildCanon
              }
              disabled={
                buildingCanon
              }
            >
              {buildingCanon
                ? "Building Canon..."
                : "Build Canon"}
            </button>

          </div>
        )}

      {result &&
        canonData &&
        renderCanonExplorer()}

    </>
  );

  // ==================================================
  // CONTINUITY PAGE
  // ==================================================

  const renderContinuityPage = () => (
    <>
      <PageHeader
        eyebrow="CONTINUITY"
        title="Continuity Checker"
        description="Inspect detected contradictions, evidence, confidence, related canon, and review decisions."
        result={result}
      />

      {!result && (
        <div className="page-empty-state">

          <div className="page-empty-icon">
            ◌
          </div>

          <p className="analysis-label">
            CONTINUITY
          </p>

          <h3>
            No manuscript selected.
          </h3>

          <p>
            Upload a manuscript and build its canon before running a continuity check.
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              navigateToPage(
                "manuscripts"
              )
            }
          >
            Go to Manuscripts →
          </button>

        </div>
      )}

      {result &&
        !canonData && (
          <div className="page-empty-state">

            <div className="page-empty-icon">
              ◈
            </div>

            <p className="analysis-label">
              CANON REQUIRED
            </p>

            <h3>
              Build the canon first.
            </h3>

            <p>
              The continuity checker compares the manuscript against its established canon.
            </p>

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                navigateToPage(
                  "canon"
                )
              }
            >
              Open Canon Explorer →
            </button>

          </div>
        )}

      {result &&
        canonData &&
        !continuityResult && (
          <div className="page-empty-state">

            <div className="page-empty-icon">
              ✓
            </div>

            <p className="analysis-label">
              READY TO CHECK
            </p>

            <h3>
              Your manuscript is ready for continuity analysis.
            </h3>

            <p>
              Run the continuity checker to detect contradictions across the manuscript.
            </p>

            <button
              type="button"
              className="primary-action"
              onClick={
                handleContinuityCheck
              }
              disabled={
                checkingContinuity
              }
            >
              {checkingContinuity
                ? "Checking Continuity..."
                : "Run Continuity Check"}
            </button>

          </div>
        )}

      {result &&
        canonData &&
        continuityResult &&
        renderContinuityResults()}

    </>
  );

  // ==================================================
  // REVIEWS PAGE
  // ==================================================

  const renderReviewsPage = () => (
    <>
      <PageHeader
        eyebrow="REVIEW MANAGEMENT"
        title="Reviews"
        description="Review, confirm, dismiss, and revisit continuity findings."
        result={result}
      />

      {!result && (
        <div className="page-empty-state">

          <div className="page-empty-icon">
            ✓
          </div>

          <p className="analysis-label">
            REVIEWS
          </p>

          <h3>
            No manuscript selected.
          </h3>

          <p>
            Upload and analyze a manuscript to create a review workspace.
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              navigateToPage(
                "manuscripts"
              )
            }
          >
            Go to Manuscripts →
          </button>

        </div>
      )}

      {result &&
        renderReviewHistory()}

    </>
  );

  // ==================================================
  // SETTINGS PAGE
  // ==================================================

  const renderSettingsPage = () => (
    <>
      <PageHeader
        eyebrow="WORKSPACE"
        title="Settings"
        description="Application and backend configuration for the Continuity & Canon Checker."
        result={result}
      />

      <section className="settings-grid">

        <div className="settings-card">

          <p className="analysis-label">
            BACKEND
          </p>

          <h3>
            API Connection
          </h3>

          <p>
            Current development backend endpoint.
          </p>

          <code>
            {API_URL}
          </code>

        </div>

        <div className="settings-card">

          <p className="analysis-label">
            WORKSPACE
          </p>

          <h3>
            Current Manuscript
          </h3>

          <p>
            {result?.filename ||
              "No manuscript loaded."}
          </p>

        </div>

        <div className="settings-card">

          <p className="analysis-label">
            ANALYSIS
          </p>

          <h3>
            Pipeline Status
          </h3>

          <p>
            {continuityResult
              ? "Continuity analysis available."
              : canonData
              ? "Canon available; continuity check pending."
              : result
              ? "Manuscript analyzed; canon pending."
              : "Waiting for manuscript upload."}
          </p>

        </div>

      </section>
    </>
  );

  // ==================================================
  // ACTIVE PAGE
  // ==================================================

  const renderActivePage = () => {
    switch (activePage) {
      case "manuscripts":
        return renderManuscriptsPage();

      case "canon":
        return renderCanonPage();

      case "continuity":
        return renderContinuityPage();

      case "reviews":
        return renderReviewsPage();

      case "settings":
        return renderSettingsPage();

      case "dashboard":
      default:
        return renderDashboardPage();
    }
  };

  // ==================================================
  // CONTINUITY RESULTS VIEW
  // ==================================================

  const renderContinuityResults = () => (
    <section className="continuity-workspace-section">

      {continuityResult && (
        <div className="continuity-result">

          <p className="analysis-label">
            CONTINUITY CHECK
          </p>

          {continuityResult.status ===
          "consistent" ? (
            <>
              <div className="consistent-icon">
                ✓
              </div>

              <h3>
                No Continuity
                Conflicts
              </h3>

              <p>
                The manuscript is
                consistent with
                the established
                canon.
              </p>
            </>
          ) : (
            <>
              <div className="conflict-icon">
                !
              </div>

              <h3>
                {
                  continuityResult.conflict_count
                }{" "}
                Conflict
                {
                  continuityResult.conflict_count !==
                  1
                    ? "s"
                    : ""
                }{" "}
                Found
              </h3>

              <p>
                The continuity
                checker found
                contradictions
                in the manuscript.
              </p>

              <div className="review-summary">

                <div className="review-summary-item">
                  <strong>
                    {
                      reviewSummary.total
                    }
                  </strong>

                  <span>
                    Total
                  </span>
                </div>

                <div className="review-summary-item">
                  <strong>
                    {
                      reviewSummary.confirmed
                    }
                  </strong>

                  <span>
                    Confirmed
                  </span>
                </div>

                <div className="review-summary-item">
                  <strong>
                    {
                      reviewSummary.dismissed
                    }
                  </strong>

                  <span>
                    Dismissed
                  </span>
                </div>

                <div className="review-summary-item">
                  <strong>
                    {
                      reviewSummary.needsReview
                    }
                  </strong>

                  <span>
                    Needs Review
                  </span>
                </div>

              </div>

              <div className="conflicts">

                {(
                  continuityResult.conflicts ||
                  []
                ).map(
                  (
                    conflict,
                    index
                  ) => {

                    const currentStatus =
                      getConflictReviewStatus(
                        conflict
                      );

                    const conflictId =
                      conflict.conflict_id ||
                      `${conflict.type}-${conflict.message}`;

                    const isSaving =
                      savingReviewId ===
                      conflictId;

                    return (
                      <div
                        className={`conflict-card review-${currentStatus}`}
                        key={
                          conflictId ||
                          index
                        }
                      >

                        <div className="review-status-row">

                          <span className="review-status-label">
                            AUTHOR REVIEW
                          </span>

                          <span
                            className={`review-status review-status-${currentStatus}`}
                          >
                            {formatStatus(
                              currentStatus
                            )}
                          </span>

                        </div>

                        <div className="conflict-header">

                          <div>

                            <p className="conflict-type">
                              {formatConflictType(
                                conflict.type
                              )}
                            </p>

                            <h4>
                              {
                                conflict.message
                              }
                            </h4>

                          </div>

                          <span className="severity">
                            {
                              conflict.severity
                            }
                          </span>

                        </div>

                        {conflict.character && (
                          <div className="conflict-field">

                            <span>
                              Character
                            </span>

                            <strong>
                              {
                                conflict.character
                              }
                            </strong>

                          </div>
                        )}

                        {renderConflictIntelligence(
                          conflict
                        )}

                        {renderEvidence(
                          conflict
                        )}

                        <button
                          type="button"
                          className="conflict-explorer-button"
                          onClick={() =>
                            openConflictExplorer(
                              conflict
                            )
                          }
                        >
                          Open Conflict Explorer →
                        </button>

                        <div className="review-actions">

                          <div className="review-actions-title">
                            Review Decision
                          </div>

                          <div className="review-buttons">

                            <button
                              type="button"
                              className={`review-button ${
                                currentStatus ===
                                "confirmed"
                                  ? "active-confirm"
                                  : ""
                              }`}
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                handleReviewDecision(
                                  conflict,
                                  "confirmed"
                                )
                              }
                            >
                              Confirm
                            </button>

                            <button
                              type="button"
                              className={`review-button ${
                                currentStatus ===
                                "dismissed"
                                  ? "active-dismiss"
                                  : ""
                              }`}
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                handleReviewDecision(
                                  conflict,
                                  "dismissed"
                                )
                              }
                            >
                              Dismiss
                            </button>

                            <button
                              type="button"
                              className={`review-button ${
                                currentStatus ===
                                "needs_review"
                                  ? "active-review"
                                  : ""
                              }`}
                              disabled={
                                isSaving
                              }
                              onClick={() =>
                                handleReviewDecision(
                                  conflict,
                                  "needs_review"
                                )
                              }
                            >
                              Review Later
                            </button>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            </>
          )}

        </div>
      )}

    </section>
  );

  // ==================================================
  // MAIN RENDER
  // ==================================================

  return (
    <div className="app-shell">

      <Sidebar
        activePage={activePage}
        navigateToPage={navigateToPage}
      />

      <div className="app-main">

        <Topbar
          activePage={activePage}
          navigationItems={
            navigationItems
          }
          result={result}
          navigateToPage={
            navigateToPage
          }
        />

        <main className="page-content">

          {error &&
            activePage !==
              "manuscripts" && (
              <div className="global-error">

                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                >
                  Dismiss
                </button>

              </div>
            )}

          {renderActivePage()}

        </main>

      </div>

      {renderConflictExplorer()}

      {renderChapterExplorer()}

    </div>
  );
}
export default App;