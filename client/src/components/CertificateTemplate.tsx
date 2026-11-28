import React from "react";
import { Certificate, CourseType } from "../types";
import { Award, GraduationCap } from "lucide-react";
import { useT } from "../i18n";

interface CertificateTemplateProps {
  data: Certificate;
  onClose: () => void;
}

const CertificateTemplate: React.FC<CertificateTemplateProps> = ({
  data,
  onClose,
}) => {
  const t = useT();
  const handlePrint = () => {
    const printContent = document.getElementById("certificate-area");
    if (printContent) {
      // Very basic print implementation for SPA
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.outerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Reload to restore React state/events
    }
  };

  const signer = data.signerName ?? t("misc.ceDirector");
  const isWorkshop = data.courseType === CourseType.WORKSHOP;
  const isCertification = data.courseType === CourseType.CERTIFICATION;

  // Logic Judul Sertifikat
  const isCompletion = data.kind === "COMPLETION";
  let titleText = t("misc.ceTitleComp");
  if (isCertification) titleText = t("misc.ceTitlePart");
  else if (isCompletion) titleText = t("misc.ceTitleDone");

  // Logic Body Text
  let bodyText = "";
  if (isCertification) {
    bodyText = t("misc.ceBodyCert");
  } else if (isCompletion) {
    bodyText = t("misc.ceBodyDone");
  } else if (isWorkshop) {
    bodyText = t("misc.ceBodyWs", { g: data.grade });
  } else {
    bodyText = t("misc.ceBodySelf", { g: data.grade });
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center no-print">
          <h3 className="font-bold flex items-center">
            <Award className="mr-2" /> {t("misc.cePreview")}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm hover:text-gray-300"
            >
              {t("misc.ceClose")}
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-digitalcoop-600 hover:bg-digitalcoop-700 rounded font-bold text-sm"
            >
              {t("misc.cePrint")}
            </button>
          </div>
        </div>

        {/* Certificate Area */}
        <div
          id="certificate-area"
          className="p-12 md:p-16 bg-white text-center relative border-[20px] border-digitalcoop-900 min-h-[600px] flex flex-col justify-center"
        >
          {/* Watermark/Background decoration */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <GraduationCap size={400} />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 text-digitalcoop-900">
                <GraduationCap size={48} />
                <span className="font-sans font-extrabold text-3xl tracking-tighter">
                  KMP - ADNG ACADEMY
                </span>
              </div>
            </div>

            <h1 className="font-serif text-5xl text-digitalcoop-800 mb-8 uppercase tracking-widest">
              {titleText}
            </h1>

            <p className="text-gray-500 text-lg mb-2">{t("misc.ceGiven")}</p>
            <h2 className="font-serif text-4xl font-bold text-gray-900 mb-8 border-b-2 border-gray-300 inline-block px-12 pb-2">
              {data.studentName}
            </h2>

            <p className="text-gray-600 text-lg mb-4 max-w-2xl mx-auto leading-relaxed">
              {bodyText}
            </p>

            <h3 className="text-2xl font-bold text-digitalcoop-900 mb-12 uppercase">
              {data.courseTitle}
            </h3>

            {/* Signature Section */}
            <div
              className={`flex justify-between px-10 items-end mt-12 text-left`}
            >
              {/* Direktur (Always Primary) */}
              <div className="text-center">
                <p className="text-gray-500 mb-12">Jakarta, {data.issueDate}</p>

                {/* Mock Signature 1 */}
                <div className="h-16 mb-2 flex items-end justify-center">
                  <span className="font-script text-3xl text-black rotate-[-2deg] opacity-80">
                    {signer}
                  </span>
                </div>

                <div className="w-56 border-t border-gray-400 pt-2 font-bold text-gray-900">
                  {signer}
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                  {t("misc.ceDirOf")}
                </p>
              </div>

              {/* Partner / Provider */}
              <div className="text-center">
                <div className="h-10 mb-14"></div>{" "}
                {/* Spacer for date alignment */}
                {isCertification ? (
                  <div className="mb-2 h-16 flex items-end justify-center">
                    <div className="px-4 py-2 border-2 border-gray-800 rounded font-bold text-xl uppercase tracking-widest opacity-60 rotate-[-5deg]">
                      {t("misc.cePartner")}
                    </div>
                  </div>
                ) : (
                  <div className="h-16 mb-2 flex items-end justify-center">
                    <span className="font-script text-3xl text-blue-900 rotate-[-5deg] opacity-80">
                      {data.instructorName}
                    </span>
                  </div>
                )}
                <div className="w-56 border-t border-gray-400 pt-2 font-bold text-gray-900">
                  {data.instructorName}
                </div>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                  {isCertification
                    ? t("misc.ceProvider")
                    : isWorkshop
                      ? t("misc.ceMentor")
                      : t("misc.ceCreator")}
                </p>
              </div>
            </div>

            {isCertification && (
              <div className="mt-8 text-xs text-gray-400 italic">
                {t("misc.ceNote")}
              </div>
            )}

            <div className="absolute bottom-4 right-4 text-[10px] text-gray-400 font-mono">
              {t("misc.ceFoot", { n: data.serial ?? data.id, t: data.courseType, q: data.serial ? `?no=${data.serial}` : "" })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateTemplate;
