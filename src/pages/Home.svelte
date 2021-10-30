<script>
  import { fade } from 'svelte/transition';
  import { cubicIn, cubicOut } from 'svelte/easing';
    import { onMount } from 'svelte';
    import Utils from "../tools/utils.js";
    import TOTP from "../tools/totp.js";
    import tippy from 'tippy.js';

    import 'tippy.js/dist/tippy.css';
    import 'tippy.js/animations/shift-away.css';

    let otpLength = 8
    let otpWindow = 30
    let secret = 'FLS5AJRNEQ6IODOCY3N4E5SY6DORTNGL'
    let secretType = 'base32'
    
    let showInfoPanel = false

    let otp = ''
    let otpCountdown = ''
    let qrURL = ''
    let shareURL = ''
    let error = ''

    let percent = 0
    let circumference = 30 * 2 * Math.PI
    const circumferenceColor = (seconds) => {
      if (seconds <= 8) {
        return 'red-500';
      } else if (seconds <= 15) {
        return 'yellow-500';
      } else {
        return 'green-500';
      }
    };

    // Start a timer
    setInterval(timer, 1000)

    // Monitor for param changes
    $: {
        otpLength, otpWindow, secret, secretType
        try {
          error = ''
          otp = TOTP.updateOtp(secret, secretType, otpLength, otpWindow)
        } catch (e) {
          error = e
        }
        qrURL = TOTP.getQRURL(secret, otpWindow, otpLength)
        shareURL = createShareURL()
    }

    function timer() {
        var epoch = Math.round(new Date().getTime() / 1000.0)
        var countDown = otpWindow - (epoch % otpWindow)
        if (epoch % otpWindow == 0) {
          try {
            error = ''
            otp = TOTP.updateOtp(secret, secretType, otpLength, otpWindow)
          } catch (e) {
            error = e
          }
        }
        percent = Math.round(100 * (countDown / otpWindow))        
        otpCountdown = countDown
    }

    function createShareURL() {
        return `https://otp.ninja?secret=${secret}&window=${otpWindow}&length=${otpLength}&type=${secretType.toLocaleLowerCase()}`
    }

    onMount(async () => {
        const params = new URLSearchParams(window.location.search)
        if (params.has('secret')) {
            secret = params.get('secret')
            console.log(`param secret: ${secret}`)
        }
        if (params.has('window')) {
            let w = params.get('window')
            if (w === '30' || w === '45' || w === '60') {
                otpWindow = Number(w)
            }
            console.log(`param otpWindow: ${otpWindow}`)
        }
        if (params.has('length')) {
            let l = params.get('length')
            if (l === '6' || l === '8') {
                otpLength = Number(l)
            }
            console.log(`param otpLength: ${otpLength}`)
        }
        if (params.has('type')) {
            let t = params.get('type')
            if (t === 'base32' || t === 'hex') {
                secretType = t
            }
            console.log(`param secret type: ${secretType}`)
        }

        try {
          error = ''
          otp = TOTP.updateOtp(secret, secretType, otpLength, otpWindow)
        } catch (e) {
          error = e
        }
        qrURL = TOTP.getQRURL(secret, otpWindow, otpLength)
        shareURL = createShareURL()
	  });

    const copyToClipboardHandler = text => {
      return event => {
        const success = Utils.copyTextToClipboard(text)
        const content = success ? 'Copied to clipboard!' : "Couldn't copy to clipboard :("

        tippy(event.target, {
          content,
          trigger: 'manual',
          animation: 'shift-away',
          hideOnClick: false,
          onShow(instance) {
            setTimeout(() => {
              instance.hide()
            }, 2000);
          },
        }).show()
      }
    }
</script>

<div class="md:bg-gradient-to-r md:from-green-400 md:to-blue-500 min-h-screen md:bg-gray-50 flex  justify-center md:py-12 sm:py-1 sm:px-6 lg:px-8">
    <div class="md:mt-8 sm:mx-auto sm:w-2/5 sm:max-w-md">
      <div class="bg-white py-8 px-4 md:shadow md:rounded-lg sm:px-10">
        <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <img class="mx-auto h-20 w-auto" src="./logo.png" alt="Workflow">
        </div>
        
        <!-- OTP & timer -->
        <div class="mt-12">
            <div class="flex items-center justify-center">
            <button on:click={copyToClipboardHandler(otp)} class="group flex justify-center">
                <span class="block text-4xl font-medium text-gray-700 group-hover:text-gray-500 mr-2">
                    {Utils.stringInsert(otp, otpLength / 2, " ")}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-9 w-9 group-hover:text-green-500 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                
            </button>
        </div>
            <div class="mt-4 flex justify-center">
                <div
                class="inline-flex items-center justify-center overflow-hidden rounded-full bottom-5 left-5"
              >
                <svg class="w-20 h-20 transform -rotate-90">
                  <circle
                    class="text-gray-300"
                    stroke-width="5"
                    stroke="currentColor"
                    fill="transparent"
                    r="30"
                    cx="40"
                    cy="40"
                  />
                  <circle
                    class="text-{circumferenceColor(otpCountdown)}"
                    stroke-width="5"
                    stroke-dasharray="{circumference}"
                    stroke-dashoffset="{circumference - percent / 100 * circumference}"
                    stroke-linecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="30"
                    cx="40"
                    cy="40"
                  />
                </svg>
                <span class="absolute text-xl text-gray-700">{otpCountdown}</span>
              </div>
            </div>
        </div>

        <!-- Length & Window -->
        <div class="mt-6 flex justify-between">
            <div>
                <div>
                    <span class="block text-sm font-medium text-gray-700">OTP Length</span>
                    <div class="mt-1">
                        <span class="relative z-0 inline-flex shadow-sm rounded-md">
                            <button type="button" on:click="{() => otpLength = 6}" class="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500" class:bg-green-100="{otpLength === 6}">
                            6
                            </button>
                            <button type="button" on:click="{() => otpLength = 8}" class="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500" class:bg-green-100="{otpLength === 8}">
                            8
                            </button>
                        </span>
                    </div>
                </div>
            </div>
            <div>
                <div>
                    <span class="block text-sm font-medium text-gray-700">OTP Window</span>
                    <div class="mt-1">
                        <span class="relative z-0 inline-flex shadow-sm rounded-md">
                            <button type="button" on:click="{() => otpWindow = 30}" class="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500" class:bg-green-100="{otpWindow === 30}">
                            30
                            </button>
                            <button type="button" on:click="{() => otpWindow = 45}" class="-ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500" class:bg-green-100="{otpWindow === 45}">
                            45
                            </button>
                            <button type="button" on:click="{() => otpWindow = 60}" class="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500" class:bg-green-100="{otpWindow === 60}">
                            60
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Secret -->
        <div class="mt-6">
            <div>
                <label for="secret" class="block text-sm font-medium text-gray-700">Secret</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 flex items-center">
                    <label for="secret_type" class="sr-only">secret_type</label>
                    <select id="secret_type" bind:value='{secretType}' name="secret_type" class="focus:ring-green-500 focus:border-green-500 h-full py-0 pl-3 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm rounded-md">
                    <option value="base32">Base32</option>
                    <option value="hex">HEX</option>
                    </select>
                </div>
                <input type="text" name="secret" id="secret" class="focus:ring-green-500 focus:border-green-500 block w-full pl-28 sm:text-sm border-gray-300 rounded-md" class:border-red-300="{error != ''}" placeholder="FLS5AJRNEQ6IODOCY3N4E5SY6DORTNGL" bind:value="{secret}">
                
                </div>
                <p class="ml-4 mt-2 text-sm text-red-600" class:invisible="{error == ''}" id="email-error">{error}</p>
            </div>
        </div>

        <!-- QR -->
        <div class="mt-6">
            <div>
                <label for="secret" class="block text-sm font-medium text-gray-700">QR Code</label>
            </div>
            <div class="flex justify-center ">
                
                <img alt="qr code" src="{qrURL}" width="200" />
            </div>
        </div>

        <!-- URL -->
        <div class="mt-6 flex justify-between">
            <button on:click={copyToClipboardHandler(shareURL)} class="text-gray-700 hover:text-gray-400" tooltip="Copy shareable URL to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </button>
            <button on:click='{() => showInfoPanel = true}' class="text-gray-700 hover:text-gray-400" tooltip="Copy shareable URL to clipboard">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
            </button>
        </div>
      </div>
      <div class="flex justify-between text-xs text-gray-800 mt-1">
          <a href="https://jonfriesen.ca" target="_blank">Jon Friesen 2021</a>
          <a class="flex" href="https://www.digitalocean.com/?refcode=cd77e6593231&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge" target="_blank">
            <img class="h-4 w-4 mr-1" src="./digitalocean.svg" alt="DigitalOcean logo" />
            Powered by DigitalOcean App Platform</a>
      </div>
    </div>
  </div>
  <!-- This example requires Tailwind CSS v2.0+ -->
  {#if showInfoPanel}
<div class="fixed inset-0 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true"
in:fade={{ duration: 100, start: 0.95, easing: cubicOut }}
     out:fade={{ duration: 75, start: 0.95, easing: cubicIn }}>
     

    <div class="absolute inset-0 overflow-hidden">
      <!-- Background overlay, show/hide based on slide-over state. -->
      <div class="absolute inset-0" aria-hidden="true">
        <div class="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div
            class="fixed inset-0 transition-opacity"
            on:click={() => (showInfoPanel = !showInfoPanel)}
            aria-hidden="true"
          />
          <!--
            Slide-over panel, show/hide based on slide-over state.
  
            Entering: "transform transition ease-in-out duration-500 sm:duration-700"
              From: "translate-x-full"
              To: "translate-x-0"
            Leaving: "transform transition ease-in-out duration-500 sm:duration-700"
              From: "translate-x-0"
              To: "translate-x-full"
          -->
          <div class="w-screen max-w-md">
            <div class="h-full flex flex-col py-6 bg-white shadow-xl overflow-y-scroll">
              <div class="px-4 sm:px-6">
                <div class="flex items-start justify-between">
                  <h2 class="text-lg font-medium text-gray-900" id="slide-over-title">
                    OTP Ninja
                  </h2>
                  <div class="ml-3 h-7 flex items-center">
                    <button type="button" on:click='{() => showInfoPanel = false}' class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                      <span class="sr-only">Close panel</span>
                      <!-- Heroicon name: outline/x -->
                      <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div class="mt-6 relative flex-1 px-4 sm:px-6">
                <div class="absolute inset-0 px-4 sm:px-6 text-sm">
                      <p>OTP Ninja is a static site for generating one time passwords (OTP). It is intended to be used as a testing utility, not for real world use. Please only use it for testing. None of the data entered is sent to the backend. The OTP's are generated in the browser, on your machine.</p>
                      <p class="mt-4">Clicking on the OTP will copy it to your clipboard. Clicking on the clipboard in the bottom left corner will copy a shareable link to the OTP configured.</p>
                      <p class="mt-4">The first version was created in 2015, with a refresh in 2021. It is currently hosted on DigitalOcean App Platform and built using TailwindCSS and SvelteJS.</p>
                      <p class="mt-4">The source code is available on <a class="text-green-400 hover:text-green-700" href="https://github.com/jonfriesen/totpclient" target="_blank">GitHub</a>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/if}