package app.pocketcivilization.game;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import java.util.Locale;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Offline wrapper: the WebView can only load this APK's bundled game assets. */
public final class MainActivity extends Activity {
  private static final String ORIGIN="https://appassets.androidplatform.net";
  private static final int EXPORT=1, IMPORT=2;
  private WebView web;
  private String pendingExport;
  private final android.os.Handler startupHandler=new android.os.Handler(android.os.Looper.getMainLooper());
  private final Runnable startupTimeout=new Runnable(){public void run(){
    if(web!=null){WebView failed=web;web=null;if(failed.getParent() instanceof ViewGroup)((ViewGroup)failed.getParent()).removeView(failed);failed.destroy();showRecovery();}
  }};
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    openGame(getPreferences(MODE_PRIVATE).getBoolean("canvasRenderer",false));
  }
  private void openGame(boolean canvasRenderer) {
    startupHandler.removeCallbacks(startupTimeout);
    getPreferences(MODE_PRIVATE).edit().putBoolean("canvasRenderer",canvasRenderer).apply();
    web=new WebView(this);
    if((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
    web.setBackgroundColor(0xff89be62);
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(false);
    web.getSettings().setMediaPlaybackRequiresUserGesture(true);
    web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.addJavascriptInterface(new SaveBridge(web),"PocketAndroid");
    web.setWebViewClient(new WebViewClient(){
      @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){
        if(view!=web)return true; // A previous view must not replace a successful retry.
        startupHandler.removeCallbacks(startupTimeout);
        // Android otherwise terminates the Activity along with the failed renderer.
        if(view==web)web=null;
        if(view.getParent() instanceof ViewGroup)((ViewGroup)view.getParent()).removeView(view);
        view.destroy();
        showRecovery();
        return true;
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !trusted(request.getUrl());}
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();if(!trusted(uri))return missing();
        String path=uri.getPath();if(path==null||path.equals("/"))path="/index.html";
        if(path.contains("..")||path.contains("\\"))return missing();
        try{return new WebResourceResponse(mime(path),"UTF-8",200,"OK",java.util.Collections.singletonMap("Cache-Control","no-cache"),getAssets().open("game"+path));}
        catch(IOException ex){return missing();}
      }
    });
    // Keep game controls clear of cutouts, status bars and gesture navigation.
    web.setOnApplyWindowInsetsListener(new android.view.View.OnApplyWindowInsetsListener(){public android.view.WindowInsets onApplyWindowInsets(android.view.View view,android.view.WindowInsets insets){
      view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;
    }});
    setContentView(web);web.loadUrl(ORIGIN+"/index.html"+(canvasRenderer?"?renderer=canvas":""));
    startupHandler.postDelayed(startupTimeout,45000);
  }
  private String localized(String de,String en,String es,String fr){
    String language=Locale.getDefault().getLanguage();
    return language.equals("de")?de:language.equals("es")?es:language.equals("fr")?fr:en;
  }
  private void showRecovery(){
    LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(android.view.Gravity.CENTER);panel.setPadding(32,48,32,48);panel.setBackgroundColor(0xfff6f3e9);
    TextView title=new TextView(this);title.setText("Pocket Civilization");title.setTextSize(26);title.setTextColor(0xff28695b);panel.addView(title);
    TextView description=new TextView(this);description.setTextSize(16);description.setPadding(0,24,0,24);
    description.setText(localized("Die Spielansicht konnte nicht angezeigt werden. Gespeicherte Spielstände bleiben erhalten. Versuche den Kompatibilitätsmodus. Wenn auch dieser nicht startet, aktualisiere Android System WebView.","The game view could not be displayed. Saved games are kept. Try compatibility mode. If it also fails to start, update Android System WebView.","No se ha podido mostrar el juego. Las partidas guardadas se conservan. Prueba el modo de compatibilidad. Si tampoco se inicia, actualiza Android System WebView.","Le jeu n’a pas pu être affiché. Les sauvegardes sont conservées. Essayez le mode de compatibilité. S’il ne démarre pas non plus, mettez à jour Android System WebView."));panel.addView(description);
    Button compatible=new Button(this);compatible.setText(localized("Im Kompatibilitätsmodus starten","Start in compatibility mode","Iniciar en modo de compatibilidad","Démarrer en mode de compatibilité"));compatible.setOnClickListener(new View.OnClickListener(){public void onClick(View v){openGame(true);}});panel.addView(compatible);
    Button retry=new Button(this);retry.setText(localized("Normal erneut starten","Retry normal graphics","Reintentar gráficos normales","Réessayer l’affichage normal"));retry.setOnClickListener(new View.OnClickListener(){public void onClick(View v){openGame(false);}});panel.addView(retry);
    Button exit=new Button(this);exit.setText(localized("Schließen","Close","Cerrar","Fermer"));exit.setOnClickListener(new View.OnClickListener(){public void onClick(View v){moveTaskToBack(true);}});panel.addView(exit);
    setContentView(panel);
  }
  private static boolean trusted(Uri uri){return "https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443);}
  private static WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));}
  private static String mime(String path){
    if(path.endsWith(".js"))return "text/javascript";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".svg"))return "image/svg+xml";if(path.endsWith(".png"))return "image/png";if(path.endsWith(".json")||path.endsWith(".webmanifest"))return "application/json";if(path.endsWith(".woff2"))return "font/woff2";return "text/html";
  }
  private void script(String source){if(web!=null)web.evaluateJavascript(source,null);}
  private final class SaveBridge {
    private final WebView owner;
    SaveBridge(WebView view){owner=view;}
    @JavascriptInterface public void ready(){runOnUiThread(new Runnable(){public void run(){if(web==owner)startupHandler.removeCallbacks(startupTimeout);}});}
    @JavascriptInterface public void exitApp(){runOnUiThread(new Runnable(){public void run(){moveTaskToBack(true);}});}
    @JavascriptInterface public void exportSave(String json){
      if(json==null||json.length()>5_000_000)return;
      runOnUiThread(new Runnable(){public void run(){pendingExport=json;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"pocket-civilization.json");startActivityForResult(i,EXPORT);}});
    }
    @JavascriptInterface public void importSave(){runOnUiThread(new Runnable(){public void run(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");startActivityForResult(i,IMPORT);}});}
  }
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(result!=RESULT_OK||data==null||data.getData()==null){pendingExport=null;return;}
    try {
      if(request==EXPORT&&pendingExport!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException();out.write(pendingExport.getBytes(StandardCharsets.UTF_8));}script("window.pocketNativeMessage&&window.pocketNativeMessage(\"saved\")");}
      else if(request==IMPORT){try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
        if(in==null)throw new IOException();byte[] buffer=new byte[8192];int count;
        while((count=in.read(buffer))!=-1){if(out.size()+count>5_000_000)throw new IOException("File too large");out.write(buffer,0,count);}
        script("window.pocketNativeImport&&window.pocketNativeImport("+JSONObject.quote(out.toString("UTF-8"))+")");
      }}
    }catch(Exception ex){script("window.pocketNativeMessage&&window.pocketNativeMessage(\"saveError\")");}finally{pendingExport=null;}
  }
  @Override protected void onPause(){script("window.pocketNativePause&&window.pocketNativePause()");super.onPause();}
  @Override protected void onResume(){super.onResume();script("window.pocketNativeResume&&window.pocketNativeResume()");}
  @Override public void onBackPressed(){if(web==null){moveTaskToBack(true);return;}script("window.pocketNativeBack&&window.pocketNativeBack()");}
  @Override protected void onDestroy(){startupHandler.removeCallbacks(startupTimeout);if(web!=null){web.removeJavascriptInterface("PocketAndroid");web.destroy();web=null;}super.onDestroy();}
}
