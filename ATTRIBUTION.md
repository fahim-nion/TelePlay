# TelePlay — Source Attribution, Terms & Content Takedown Policy

## 1. Upstream Data Sources & Attribution

TelePlay is an open-source metadata directory and technical health monitor for publicly broadcast Free-To-Air (FTA) streams. We gratefully acknowledge the following upstream data sources and open communities:

### Free-TV / IPTV
- **Repository**: [Free-TV/IPTV](https://github.com/Free-TV/IPTV)
- **License**: MIT License
- **Attribution**: Daily community-maintained directory of legal Free-To-Air television broadcasts.

### iptv-org
- **Repository**: [iptv-org/iptv](https://github.com/iptv-org/iptv)
- **License**: Unlicense / Public Domain
- **Attribution**: Global collection of publicly available IPTV channels. TelePlay utilizes partitioned category and country feeds.

---

## 2. Tools & References

TelePlay acknowledges and references the following open-source tools:
- **M3Unator**: Reference for playlist deduplication and validation patterns.
- **PlaylistEditorTV**: Reference for channel tagging and categorization standards.
- **awesome-iptv**: Curated directory of IPTV resources and tools.
- **StreamCheck**: Reference for stream availability detection concepts.
- **N_m3u8DL-RE**: Reference for HLS protocol analysis.

*Note: In accordance with our safety and resource policies, external tools are used strictly as technical references. TelePlay does not download media streams or run unauthorized automated scrapers.*

---

## 3. Streaming Architecture & Legal Disclaimer

1. **No Video Hosting or Proxying**: TelePlay does **not** host, transcode, store, or proxy any audio/video media files or live streams. All playback connections occur directly between the user's web browser or media player and the respective official broadcast server.
2. **Free-To-Air (FTA) Only**: TelePlay indexes exclusively publicly accessible, non-authenticated Free-To-Air television broadcasts.
3. **No Circumvention**: TelePlay does not bypass DRM, paywalls, geo-blocks, token authentication, or any technological protection measures.
4. **Availability & Guarantees**: Broadcast stream availability is controlled entirely by third-party broadcasters. TelePlay provides technical status metrics ("working", "intermittent", "unreachable") with timestamped provenance for informational purposes without warranty of continuous uptime.

---

## 4. Broken Link & Content Takedown Policy (DMCA / Rightsholder Notice)

TelePlay respects intellectual property rights and adheres to prompt review and removal policies for disputed content.

### Submitting a Takedown or Removal Request
If you are a copyright owner, broadcaster, or authorized representative and wish to have a stream link or channel metadata removed from TelePlay:

1. **In-App Reporting**: Use the built-in **"Report Broken / Inappropriate Stream"** action on any channel card or row to submit an immediate report to administrators.
2. **Direct Contact**: You may also open a GitHub Issue or submit a formal removal request containing:
   - Identification of the copyrighted work or stream URL claimed to be infringed or improperly listed.
   - Channel name and source attribution listed in TelePlay.
   - Statement of authority or ownership.
   - Contact details (name, organization, email address).

### Administrative Action
Upon receipt of a valid removal notice or broken stream report, TelePlay administrators will:
1. Immediately flag or disable the referenced channel entry from the catalogue.
2. Blacklist the stream URL in the ingestion engine to prevent re-importing from upstream feeds.
3. Keep an audit record of the action in the administrative system.

