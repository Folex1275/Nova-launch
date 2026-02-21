import { useCallback, useEffect, useRef } from "react";
import { Hero, HowItWorks } from "../components/landing";
import { LANDING_SECTION_IDS } from "../components/landing/sectionIds";
import { WalletInfo } from "../components/WalletConnect";
import { Button } from "../components/UI";
import { useToast } from "../hooks/useToast";
import type { WalletState } from "../types";

const SCROLL_DURATION_MS = 700;
const ACTIVE_LANDING_SECTIONS = [
  LANDING_SECTION_IDS.hero,
] as const;

interface LandingPageProps {
  network: "testnet" | "mainnet";
  setNetwork: (network: "testnet" | "mainnet") => void;
  wallet: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export default function LandingPage({
  network,
  setNetwork,
  wallet,
  connect,
  disconnect,
  isConnecting,
}: LandingPageProps) {
  const animationRef = useRef<number | null>(null);
  const { error: showError } = useToast();

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (err: any) {
      if (err.message?.includes('not installed')) {
        showError(
          'Freighter wallet is not installed. Please install the Freighter extension from the Chrome Web Store.',
          { duration: 7000 }
        );
        // Open Freighter installation page
        window.open('https://www.freighter.app/', '_blank');
      } else {
        showError(err.message || 'Failed to connect wallet. Please try again.');
      }
    }
  }, [connect, showError]);

  const stopCurrentScroll = useCallback(() => {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const scrollToSection = useCallback((sectionId: string, shouldPushState = true) => {
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    stopCurrentScroll();

    const startY = window.scrollY;
    const targetY = window.scrollY + target.getBoundingClientRect().top;
    const distance = targetY - startY;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = window.requestAnimationFrame(animate);

    const nextUrl = `${window.location.pathname}#${sectionId}`;
    if (shouldPushState) {
      window.history.pushState(null, "", nextUrl);
    } else {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [stopCurrentScroll]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[data-scroll-link="true"]') as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      const hash = anchor.getAttribute("href")?.split("#")[1];
      if (!hash) {
        return;
      }

      event.preventDefault();
      scrollToSection(hash);
    };

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      stopCurrentScroll();
    };
  }, [scrollToSection, stopCurrentScroll]);

  useEffect(() => {
    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && ACTIVE_LANDING_SECTIONS.includes(initialHash as (typeof ACTIVE_LANDING_SECTIONS)[number])) {
      const timer = window.setTimeout(() => {
        scrollToSection(initialHash, false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [scrollToSection]);

  return (
    <main className="landing-page dark bg-background-dark text-left text-text-primary">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-transparent backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={`#${LANDING_SECTION_IDS.hero}`} data-scroll-link="true" className="text-2xl font-semibold tracking-tight text-text-primary">
            NovaLaunch
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            <a href={`#${LANDING_SECTION_IDS.hero}`} data-scroll-link="true" className="text-lg text-text-secondary transition hover:text-primary">Home</a>
            <a href={`#${LANDING_SECTION_IDS.features}`} data-scroll-link="true" className="text-lg text-text-secondary transition hover:text-primary">Features</a>
            <a href={`#${LANDING_SECTION_IDS.howItWorks}`} data-scroll-link="true" className="text-lg text-text-secondary transition hover:text-primary">How It Works</a>
            <a href={`#${LANDING_SECTION_IDS.faq}`} data-scroll-link="true" className="text-lg text-text-secondary transition hover:text-primary">FAQ</a>
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {wallet.connected && wallet.address ? (
              <WalletInfo wallet={wallet} onDisconnect={disconnect} />
            ) : (
              <Button 
                size="sm" 
                onClick={handleConnect} 
                loading={isConnecting}
                className="bg-primary hover:bg-[#E63428]"
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>
      <Hero 
        wallet={wallet}
        connect={handleConnect}
        disconnect={disconnect}
        isConnecting={isConnecting}
      />
      <HowItWorks />
    </main>
  );
}
