export default function Footer() {
  return (
    <footer className="border-t border-border mt-10 py-7 px-4 text-xs text-muted leading-relaxed bg-surface-2/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <p className="font-extrabold text-foreground/80 text-sm tracking-tight mb-1.5">
            타이어존
          </p>
          <p>(주)타이어존 / 대표이사 김대표 / 사업자등록번호 000-00-00000</p>
          <p>
            통신판매업신고 제0000-경기000-00000호 / 개인정보관리책임자 :
            관리자(admin@tirezone.example)
          </p>
          <p>경기도 어딘가시 어딘가로 123 / 고객센터 : 1588-0000</p>
          <p className="mt-1">copyright ⓒ tirezone. 데모 사이트입니다.</p>
        </div>
        <div className="text-right sm:text-right shrink-0">
          <p className="text-foreground/70 font-semibold">고객센터</p>
          <a
            href="tel:1588-0000"
            className="font-extrabold text-lg bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent hover:opacity-80"
          >
            1588-0000
          </a>
          <p>평일 09:00 ~ 18:00 (주말·공휴일 제외)</p>
        </div>
      </div>
    </footer>
  );
}
