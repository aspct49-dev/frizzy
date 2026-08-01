import Link from "next/link";
import { FaDiscord, FaTwitch, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiKick } from "react-icons/si";
import { DISCORD_URL } from "../data";

const KICK_URL = "https://kick.com/frizzybets";

const socials = [
  { href: KICK_URL, label: "Kick", Icon: SiKick },
  { href: "https://www.twitch.tv/frizzable", label: "Twitch", Icon: FaTwitch },
  { href: "https://www.youtube.com/@frizzybets", label: "YouTube", Icon: FaYoutube },
  { href: "https://x.com/Frizzable", label: "X / Twitter", Icon: FaXTwitter },
  { href: DISCORD_URL, label: "Discord", Icon: FaDiscord },
];

const socialCards = [
  {
    href: KICK_URL,
    name: "Kick",
    blurb: "Watch live streams",
    action: "Watch",
    Icon: SiKick,
  },
  {
    href: "https://www.twitch.tv/frizzable",
    name: "Twitch",
    blurb: "Catch the streams",
    action: "Follow",
    Icon: FaTwitch,
  },
  {
    href: "https://www.youtube.com/@frizzybets",
    name: "YouTube",
    blurb: "Subscribe on channel",
    action: "Subscribe",
    Icon: FaYoutube,
  },
  {
    href: "https://x.com/Frizzable",
    name: "X / Twitter",
    blurb: "Stay in touch",
    action: "Follow",
    Icon: FaXTwitter,
  },
  {
    href: DISCORD_URL,
    name: "Discord",
    blurb: "Join the community",
    action: "Join",
    Icon: FaDiscord,
  },
];

function SocialLinks({ footer = false }: { footer?: boolean }) {
  return (
    <div className={footer ? "footerSocialLinks" : "socialLinkList"}>
      {socials.map(({ href, label, Icon }) => (
        <a href={href} key={label} target="_blank" rel="noreferrer" aria-label={`Follow Frizzybets on ${label}`}>
          <Icon aria-hidden="true" focusable="false" />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}

export function SiteFooter() {
  return (
    <>
      <div className="band bandDeep bandSocials">
      <section className="socialBand" aria-labelledby="social-band-title">
        <div className="socialBandInner">
          <div className="centerHeading" data-reveal="heading">
            <h2 id="social-band-title">Keep Up With Frizzy</h2>
          </div>

          <div className="socialCards">
            {socialCards.map(({ href, name, blurb, action, Icon }) => (
              <article className="socialCard" data-reveal="card" key={name}>
                <span className="socialCardIcon" aria-hidden="true"><Icon /></span>
                <h3>{name}</h3>
                <p>{blurb}</p>
                <a
                  className="perkAction socialCardAction"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${action} Frizzybets on ${name}`}
                >
                  {action}
                </a>
              </article>
            ))}
          </div>

          
        </div>
      </section>
      </div>

      <div className="band bandFooter">
      <footer className="siteFooter">
        <div className="footerGrid">
          <div className="footerBrandCol">
            <Link className="footerBrand" href="/" aria-label="Frizzybets home">
              <img src="/frizzybets-wordmark.png" alt="Frizzybets" />
            </Link>
            <p>
              The official home of the Frizzybets Stake leaderboard, bonuses, and live streams.
            </p>
          </div>

          <div className="footerCol">
            <span>Navigate</span>
            <Link href="/">Home</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            <Link href="/#bonuses">Bonuses</Link>
            <Link href="/#videos">Videos</Link>
          </div>

          <div className="footerCol">
            <span>Partners</span>
            <a href="https://stake.com/?c=frizz" target="_blank" rel="noreferrer">Stake - code frizz</a>
            <a href="https://stake.us/?c=frizz" target="_blank" rel="noreferrer">Stake.us - code frizz</a>
          </div>

          <div className="footerCol footerSocialCol">
            <span>Socials</span>
            <SocialLinks footer />
          </div>
        </div>

        <div className="footerNotice">
          <span className="agePill">18+</span>
          <p>
            Gamble responsibly. Gambling can be addictive - always play within your limits and never
            wager more than you can afford to lose. Visit{" "}
            <a href="https://www.begambleaware.org" target="_blank" rel="noreferrer">BeGambleAware.org</a>{" "}
            for support. You must be 18+ or the legal age in your jurisdiction to participate.
          </p>
        </div>

        <p className="footerDisclaimer">
          Frizzybets is an independent affiliate of Stake and Stake.us and is not owned or operated
          by them. We may earn a commission when you sign up or play using code frizz. Nothing
          here is a guarantee of winnings; gambling involves real financial risk.
        </p>

        <div className="footerBottom">
          <span>&copy; 2026 Frizzybets. All rights reserved.</span>
          <a href={KICK_URL} target="_blank" rel="noreferrer">Watch live on Kick</a>
        </div>
      </footer>
      </div>
    </>
  );
}
